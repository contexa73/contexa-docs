/**
 * Contexa Website i18n Build Script
 *
 * Builds multi-language static site from templates.
 * Input:  src/ (templates), includes/ (shared components), locale/ (translations), content/ (body text)
 * Output: dist/en/, dist/ko/ (complete HTML), dist/assets/ (shared static resources)
 *
 * Usage: node build.js
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'src');
const INCLUDES_DIR = path.join(ROOT, 'includes');
const LOCALE_DIR = path.join(ROOT, 'locale');
const CONTENT_DIR = path.join(ROOT, 'content');
const ASSETS_DIR = path.join(ROOT, 'assets');
const DIST_DIR = path.join(ROOT, 'dist');

const LANGUAGES = ['en', 'ko'];
const CACHE_BUST = '?v=' + Date.now();

// ?? Utilities ??????????????????????????????????????????????

function findHtmlFiles(dir) {
  let results = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(findHtmlFiles(full));
    } else if (item.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of fs.readdirSync(src)) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
}

function getRelativeRoot(filePath, langDir) {
  const rel = path.relative(path.dirname(filePath), langDir);
  if (!rel) return './';
  return rel.replace(/\\/g, '/') + '/';
}

function absolutizeInternalPath(rawPath, relPath, lang) {
  if (!rawPath) return rawPath;
  const normalized = rawPath.replace(/\\/g, '/');
  if (
    normalized.startsWith('#') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('//') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:') ||
    normalized.startsWith('javascript:') ||
    normalized.startsWith('data:')
  ) {
    return rawPath;
  }

  const suffixIndex = normalized.search(/[?#]/);
  const pathPart = suffixIndex >= 0 ? normalized.slice(0, suffixIndex) : normalized;
  const suffix = suffixIndex >= 0 ? normalized.slice(suffixIndex) : '';

  if (!pathPart) return rawPath;

  if (pathPart.startsWith('/')) {
    const internal = pathPart.slice(1);
    if (internal.startsWith('assets/')) return '/' + internal + suffix;
    if (/^(en|ko)\//.test(internal)) return '/' + internal + suffix;
    return '/' + lang + '/' + internal + suffix;
  }

  const currentPage = '/' + lang + '/' + relPath.replace(/\\/g, '/');
  const baseDir = path.posix.dirname(currentPage);
  const resolved = path.posix.normalize(path.posix.join(baseDir, pathPart));
  return resolved + suffix;
}

function rewriteInternalAttributesToAbsolute(html, relPath, lang) {
  return html.replace(/(href|src|action)="([^"]*?)"/g, (match, attr, value) => {
    const rewritten = absolutizeInternalPath(value, relPath, lang);
    return attr + '="' + rewritten + '"';
  });
}

function appendInsideFirstElementByClass(html, className, insertion) {
  const classPattern = new RegExp(`<([a-zA-Z][\\w:-]*)\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'i');
  const openMatch = classPattern.exec(html);
  if (!openMatch) return html;

  const tagName = openMatch[1].toLowerCase();
  const startIndex = openMatch.index;
  const openEndIndex = startIndex + openMatch[0].length;
  const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
  tagPattern.lastIndex = startIndex;

  let depth = 0;
  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    const token = match[0];
    const isClosing = token.startsWith('</');
    const isSelfClosing = token.endsWith('/>');

    if (!isClosing) {
      if (!isSelfClosing) depth++;
      continue;
    }

    depth--;
    if (depth === 0 && match.index >= openEndIndex) {
      return html.slice(0, match.index) + insertion + html.slice(match.index);
    }
  }

  return html;
}

function ensureDocsTocSidebar(html, relPath) {
  if (!(relPath.startsWith('docs' + path.sep) || relPath.startsWith('docs/'))) {
    return html;
  }
  if (html.indexOf('id="docs-toc-sidebar"') !== -1) {
    return html;
  }

  return appendInsideFirstElementByClass(
    html,
    'docs-layout',
    '      <aside class="docs-toc-sidebar" id="docs-toc-sidebar" aria-label="On this page navigation"></aside>\n'
  );
}
// ?? i18n Marker Resolution ?????????????????????????????????

function flattenObject(obj, prefix) {
  let result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenObject(value, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

function resolveI18nMarkers(html, locale, lang, currentRelPath) {
  const flat = flattenObject(locale, '');

  // Replace {{i18n.key}} markers
  html = html.replace(/\{\{i18n\.([a-zA-Z0-9_.]+)\}\}/g, (match, key) => {
    return flat[key] !== undefined ? flat[key] : match;
  });

  // Replace language switcher markers
  const otherLang = lang === 'en' ? 'ko' : 'en';
  const currentPage = '/' + currentRelPath.replace(/\\/g, '/');
  const otherHref = '/' + otherLang + currentPage;
  const selfHref = '/' + lang + currentPage;

  html = html.replace('{{i18n.langSwitch.enHref}}', lang === 'en' ? selfHref : '/en' + currentPage);
  html = html.replace('{{i18n.langSwitch.koHref}}', lang === 'ko' ? selfHref : '/ko' + currentPage);
  html = html.replace('{{i18n.langSwitch.enActive}}', lang === 'en' ? ' active' : '');
  html = html.replace('{{i18n.langSwitch.koActive}}', lang === 'ko' ? ' active' : '');

  return html;
}

// ?? Link Adjustment ????????????????????????????????????????

function adjustLinksToRelative(html, relRoot) {
  // Convert absolute internal links (/path) to relative (relRoot + path)
  return html.replace(/(href|src|action)="\/([^"]*?)"/g, (match, attr, p) => {
    // Skip external protocols and anchors
    if (p.startsWith('http') || p.startsWith('//')) return match;
    return `${attr}="${relRoot}${p}"`;
  });
}

// ?? Main Build Pipeline ????????????????????????????????????

function build() {
  console.log('Contexa i18n Build');
  console.log('==================\n');

  // Clean dist
  cleanDir(DIST_DIR);

  // Copy assets to dist/assets/
  console.log('Copying assets...');
  copyDirSync(ASSETS_DIR, path.join(DIST_DIR, 'assets'));

  // Load includes
  const header = readUtf8(path.join(INCLUDES_DIR, 'header.html'));
  const footer = readUtf8(path.join(INCLUDES_DIR, 'footer.html'));
  const sidebar = readUtf8(path.join(INCLUDES_DIR, 'docs-sidebar.html'));

  // Find all source templates
  const srcFiles = findHtmlFiles(SRC_DIR);
  console.log(`Found ${srcFiles.length} source templates\n`);

  // Build each language
  for (const lang of LANGUAGES) {
    console.log(`Building ${lang.toUpperCase()}...`);

    const locale = JSON.parse(readUtf8(path.join(LOCALE_DIR, `${lang}.json`)));
    const langDir = path.join(DIST_DIR, lang);
    fs.mkdirSync(langDir, { recursive: true });

    let processed = 0;
    let errors = 0;

    for (const srcFile of srcFiles) {
      const relPath = path.relative(SRC_DIR, srcFile);
      const outFile = path.join(langDir, relPath);

      try {
        let html = readUtf8(srcFile);

        // 1. Inject includes
        html = html.replace('{{header}}', header);
        html = html.replace('{{footer}}', footer);
        html = html.replace('{{sidebar}}', sidebar);

        // 2. Inject content
        // For non-EN languages, load from content/{lang}/ if exists, else fallback to content/en/
        const contentFile = path.join(CONTENT_DIR, lang, relPath);
        const contentFileFallback = path.join(CONTENT_DIR, 'en', relPath);

        if (html.includes('{{content}}')) {
          let contentHtml = '';
          if (fs.existsSync(contentFile)) {
            contentHtml = readUtf8(contentFile);
          } else if (fs.existsSync(contentFileFallback)) {
            contentHtml = readUtf8(contentFileFallback);
          }
          html = html.replace('{{content}}', contentHtml);
        }

        // 3. Resolve i18n markers
        html = resolveI18nMarkers(html, locale, lang, relPath);

        // 4. Set <html lang="...">
        html = html.replace(/<html\s+lang="[^"]*"/, `<html lang="${lang}"`);

        // 5. Add main-content id for skip link
        html = html.replace('<main class="site-main">', '<main class="site-main" id="main-content">');

        // 6. Add hreflang, favicon, and OG meta tags in <head>
        const pageUrl = '/' + relPath.replace(/\\/g, '/');
        const hreflangTags = LANGUAGES.map(l =>
          `<link rel="alternate" hreflang="${l}" href="/${l}${pageUrl}">`
        ).join('\n  ');

        const titleMatch = html.match(/<title>([^<]*)<\/title>/);
        const pageTitle = titleMatch ? titleMatch[1] : 'Contexa';
        const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
        const pageDesc = descMatch ? descMatch[1] : 'AI-Native Security Platform for Spring';

        const headTags = [
          `<!-- Favicon -->`,
          `<link rel="icon" type="image/png" sizes="32x32" href="/assets/img/dark.png">`,
          `<link rel="apple-touch-icon" href="/assets/img/dark.png">`,
          `<!-- Open Graph -->`,
          `<meta property="og:type" content="website">`,
          `<meta property="og:title" content="${pageTitle}">`,
          `<meta property="og:description" content="${pageDesc}">`,
          `<meta property="og:image" content="https://ctxa.ai/assets/img/logo.png">`,
          `<meta property="og:url" content="https://ctxa.ai/${lang}${pageUrl}">`,
          `<meta property="og:site_name" content="Contexa">`,
          `<!-- Twitter Card -->`,
          `<meta name="twitter:card" content="summary">`,
          `<meta name="twitter:title" content="${pageTitle}">`,
          `<meta name="twitter:description" content="${pageDesc}">`,
          `<meta name="twitter:image" content="https://ctxa.ai/assets/img/logo.png">`,
          `<!-- Hreflang -->`,
          ...hreflangTags.split('\n  ')
        ].join('\n  ');

        // Early theme initialization to prevent FOUC
        const themeInit = `<script>(function(){var t=localStorage.getItem('contexa-theme');if(t){document.documentElement.setAttribute('data-theme',t)}else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.setAttribute('data-theme','dark')}})()</script>`;

        html = html.replace('</head>', `  ${themeInit}\n  ${headTags}\n</head>`);

        // 7. Rewrite all internal links to root-absolute language-aware paths
        html = rewriteInternalAttributesToAbsolute(html, relPath, lang);

        // 8. Inject theme.js, lang.js, and header-search.js after nav.js
        html = html.replace(
          /(<script\s+[^>]*nav\.js[^>]*><\/script>)/,
          '$1\n  <script src="/assets/js/theme.js"></script>\n  <script src="/assets/js/lang.js"></script>\n  <script src="/assets/js/header-search.js"></script>'
        );

        // 10. Cache busting
        html = html.replace(/(href="[^"]*\.css)(\?v=[^"]*)?(")/g, `$1${CACHE_BUST}$3`);
        html = html.replace(/(src="[^"]*\.js)(\?v=[^"]*)?(")/g, `$1${CACHE_BUST}$3`);

        // 11. Wrap api-tables with scroll container
        html = html.replace(/<div class="table-scroll">(<table[\s\S]*?<\/table>)<\/div>/g, '$1');
        html = html.replace(/<table class="api-table">([\s\S]*?)<\/table>/g,
          '<div class="table-scroll"><table class="api-table">$1</table></div>');

        // 12. Clean up empty comments left by template extraction
        html = html.replace(/\n\s*<!-- Mobile sidebar overlay -->\s*\n/g, '\n');
        html = html.replace(/\n\s*<!-- Mobile sidebar toggle button -->\s*\n/g, '\n');

        // 13. Inject right-side TOC sidebar container for docs pages
        //     Must be inside .docs-layout (flex sibling of .docs-content).
        html = ensureDocsTocSidebar(html, relPath);

        // Write output
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.writeFileSync(outFile, html, 'utf-8');
        processed++;
      } catch (err) {
        console.error(`  ERROR: ${relPath}: ${err.message}`);
        errors++;
      }
    }

    console.log(`  ${processed} files, ${errors} errors\n`);
  }

  // Create root index.html with language detection redirect
  const rootIndex = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contexa</title>
  <script>
    var lang = (navigator.language || '').startsWith('ko') ? 'ko' : 'en';
    var stored = localStorage.getItem('contexa-lang');
    if (stored) lang = stored;
    window.location.replace('/' + lang + '/index.html');
  </script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), rootIndex, 'utf-8');

  // Generate search index per language
  console.log('Generating search index...');
  for (const lang of LANGUAGES) {
    const langDir = path.join(DIST_DIR, lang);
    const langFiles = findHtmlFiles(langDir);
    const searchIndex = [];

    for (const file of langFiles) {
      const relPath = '/' + lang + '/' + path.relative(langDir, file).replace(/\\/g, '/');
      if (relPath.includes('404')) continue;

      const html = fs.readFileSync(file, 'utf-8');
      const $ = cheerio.load(html);

      const title = $('title').text().replace(/\s*[|??]\s*Contexa.*$/i, '').trim() || $('h1').first().text().trim();
      if (!title) continue;

      // Extract headings
      const headings = [];
      $('h2, h3').each(function() { headings.push($(this).text().trim()); });

      // Extract body text (remove scripts, styles, nav, header, footer)
      $('script, style, nav, header, footer, .sidebar, .toc').remove();
      const bodyText = $('main, .content, .doc-content, article, body').text()
        .replace(/\s+/g, ' ').trim().substring(0, 3000);

      if (bodyText.length < 10) continue;

      searchIndex.push({
        t: title,
        p: relPath,
        h: headings.join(' '),
        c: bodyText
      });
    }

    const indexPath = path.join(DIST_DIR, 'assets', `search-index-${lang}.json`);
    fs.writeFileSync(indexPath, JSON.stringify(searchIndex), 'utf-8');
    console.log(`  ${lang}: ${searchIndex.length} pages indexed (${(JSON.stringify(searchIndex).length / 1024).toFixed(1)} KB)`);
  }

  // Verification: check for unresolved markers
  console.log('Verification...');
  let unresolvedCount = 0;
  const distFiles = findHtmlFiles(DIST_DIR);
  for (const file of distFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const markers = content.match(/\{\{[^}]+\}\}/g);
    if (markers) {
      const relPath = path.relative(DIST_DIR, file);
      console.warn(`  WARNING: ${relPath} has ${markers.length} unresolved markers: ${markers.slice(0, 3).join(', ')}`);
      unresolvedCount += markers.length;
    }
  }

  if (unresolvedCount === 0) {
    console.log('  All markers resolved!\n');
  } else {
    console.warn(`  ${unresolvedCount} unresolved markers remain\n`);
  }

  console.log(`Build complete: ${LANGUAGES.length} languages, ${distFiles.length} output files`);
}

build();
