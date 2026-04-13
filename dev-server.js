const express = require('express');
const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');
const WATCH_DIRS = [
  path.join(ROOT, 'assets'),
  path.join(ROOT, 'content'),
  path.join(ROOT, 'includes'),
  path.join(ROOT, 'locale'),
  path.join(ROOT, 'src'),
  path.join(ROOT, 'build.js'),
  path.join(ROOT, 'validate-docs.js')
];

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';
const LOCALIZED_PREFIXES = ['en', 'ko'];

let buildRunning = false;
let buildQueued = false;
let serverStarted = false;

function log(message) {
  const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
  console.log(`[dev ${timestamp}] ${message}`);
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/');
}

function sanitizeRelativePath(value) {
  const normalized = normalizeSlashes(value).replace(/^\/+/, '');
  if (!normalized) {
    return '';
  }
  const resolved = path.posix.normalize(normalized);
  if (resolved.startsWith('..')) {
    return '';
  }
  return resolved.replace(/^\/+/, '');
}

function fileExists(relativePath) {
  if (!relativePath) {
    return false;
  }
  const absolutePath = path.join(DIST_DIR, relativePath);
  return fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile();
}

function resolvePreferredLanguage(req) {
  const accepted = req.acceptsLanguages(...LOCALIZED_PREFIXES);
  return accepted && LOCALIZED_PREFIXES.includes(accepted) ? accepted : 'en';
}

function buildCandidates(relativePath, preferredLanguage) {
  const clean = sanitizeRelativePath(relativePath);
  const withoutTrailingSlash = clean.replace(/\/+$/, '');
  const candidates = [];

  const pushCandidate = (candidate) => {
    const normalized = sanitizeRelativePath(candidate);
    if (!normalized) {
      return;
    }
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  if (!withoutTrailingSlash) {
    pushCandidate('index.html');
    pushCandidate(`${preferredLanguage}/index.html`);
    return candidates;
  }

  const hasExtension = path.posix.extname(withoutTrailingSlash) !== '';

  pushCandidate(withoutTrailingSlash);
  if (!hasExtension) {
    pushCandidate(`${withoutTrailingSlash}.html`);
    pushCandidate(`${withoutTrailingSlash}/index.html`);
  }

  const hasLocalizedPrefix = LOCALIZED_PREFIXES.some((prefix) => withoutTrailingSlash === prefix || withoutTrailingSlash.startsWith(`${prefix}/`));
  if (!hasLocalizedPrefix && !withoutTrailingSlash.startsWith('assets/')) {
    pushCandidate(`${preferredLanguage}/${withoutTrailingSlash}`);
    if (!hasExtension) {
      pushCandidate(`${preferredLanguage}/${withoutTrailingSlash}.html`);
      pushCandidate(`${preferredLanguage}/${withoutTrailingSlash}/index.html`);
    }

    const fallbackLanguage = preferredLanguage === 'en' ? 'ko' : 'en';
    pushCandidate(`${fallbackLanguage}/${withoutTrailingSlash}`);
    if (!hasExtension) {
      pushCandidate(`${fallbackLanguage}/${withoutTrailingSlash}.html`);
      pushCandidate(`${fallbackLanguage}/${withoutTrailingSlash}/index.html`);
    }
  }

  return candidates;
}

function resolveRequestFile(requestPath, preferredLanguage) {
  const candidates = buildCandidates(requestPath, preferredLanguage);
  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return path.join(DIST_DIR, candidate);
    }
  }
  return null;
}

function runBuild() {
  if (buildRunning) {
    buildQueued = true;
    return Promise.resolve(false);
  }

  buildRunning = true;
  buildQueued = false;
  log('build started');

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['build.js'], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true
    });

    child.on('error', (error) => {
      buildRunning = false;
      reject(error);
    });

    child.on('exit', (code) => {
      buildRunning = false;
      if (code !== 0) {
        reject(new Error(`build failed with exit code ${code}`));
        return;
      }

      log('build completed');
      resolve(true);

      if (buildQueued) {
        setImmediate(() => {
          runBuild().catch((error) => {
            log(`queued build failed: ${error.message}`);
          });
        });
      }
    });
  });
}

async function start() {
  await runBuild();

  const app = express();
  app.disable('etag');

  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }

    const preferredLanguage = resolvePreferredLanguage(req);
    const resolvedFile = resolveRequestFile(req.path, preferredLanguage);
    if (resolvedFile) {
      res.sendFile(resolvedFile);
      return;
    }

    next();
  });

  app.use(express.static(DIST_DIR, {
    index: false,
    redirect: false,
    extensions: ['html']
  }));

  app.use((req, res) => {
    res.status(404).sendFile(path.join(DIST_DIR, 'en', '404.html'));
  });

  const server = app.listen(PORT, HOST, () => {
    serverStarted = true;
    log(`serving ${DIST_DIR} at http://${HOST}:${PORT}`);
  });

  const watcher = chokidar.watch(WATCH_DIRS, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 25
    }
  });

  const scheduleBuild = (event, changedPath) => {
    log(`${event}: ${path.relative(ROOT, changedPath)}`);
    runBuild().catch((error) => {
      log(`build failed: ${error.message}`);
    });
  };

  watcher
    .on('add', (changedPath) => scheduleBuild('add', changedPath))
    .on('change', (changedPath) => scheduleBuild('change', changedPath))
    .on('unlink', (changedPath) => scheduleBuild('unlink', changedPath));

  const shutdown = async () => {
    if (!serverStarted) {
      process.exit(0);
      return;
    }
    log('shutting down');
    await watcher.close();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

