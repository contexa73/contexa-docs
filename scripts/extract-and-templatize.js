/**
 * Extract content from HTML files and create templates.
 *
 * For docs pages: extracts .docs-content-inner innerHTML
 * For landing pages: extracts main.site-main innerHTML
 *
 * Saves extracted content to content/en/
 * Replaces extracted content with {{content}} marker in src/
 * Also normalizes header/footer to {{header}}/{{footer}} markers
 * and sidebar to {{sidebar}} marker
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const CONTENT_EN_DIR = path.join(ROOT, 'content', 'en');

const LANDING_PAGES = ['index.html', 'get-started.html', 'community.html'];

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

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function processFile(filePath) {
  const relPath = path.relative(SRC_DIR, filePath);
  const isLanding = LANDING_PAGES.includes(relPath);
  const isDocs = relPath.startsWith('docs' + path.sep) || relPath.startsWith('docs/');

  let html = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(html, { decodeEntities: false });

  // Extract content
  let contentHtml;
  if (isDocs) {
    const inner = $('.docs-content-inner');
    if (inner.length) {
      contentHtml = inner.html().trim();
      inner.html('\n          {{content}}\n        ');
    }
  } else if (isLanding) {
    const main = $('main.site-main');
    if (main.length) {
      contentHtml = main.html().trim();
      main.html('\n    {{content}}\n  ');
    }
  }

  // Save extracted content
  if (contentHtml) {
    const contentPath = path.join(CONTENT_EN_DIR, relPath);
    ensureDir(contentPath);
    fs.writeFileSync(contentPath, contentHtml, 'utf-8');
  }

  // Replace header - either data-include or inlined
  $('div[data-include="/includes/header.html"]').replaceWith('{{header}}');
  // If header was already inlined (has <header class="site-header">)
  const inlinedHeader = $('header.site-header');
  if (inlinedHeader.length) {
    // Also remove the mobile-nav that follows
    inlinedHeader.next('.mobile-nav').remove();
    inlinedHeader.replaceWith('{{header}}');
  }

  // Replace footer - either data-include or inlined
  $('div[data-include="/includes/footer.html"]').replaceWith('{{footer}}');
  const inlinedFooter = $('footer.site-footer');
  if (inlinedFooter.length) {
    inlinedFooter.replaceWith('{{footer}}');
  }

  // Replace sidebar (only in docs pages) - already inlined
  if (isDocs) {
    const sidebar = $('nav.docs-sidebar');
    if (sidebar.length) {
      // Also remove mobile sidebar overlay and toggle
      sidebar.siblings('.sidebar-overlay').remove();
      sidebar.siblings('.sidebar-toggle').remove();
      sidebar.replaceWith('{{sidebar}}');
    }
  }

  // Remove include.js script tag
  $('script[src*="include.js"]').remove();

  // Remove cache busting from CSS/JS references (build.js will handle this)
  let output = $.html();
  output = output.replace(/(\.(css|js))\?v=\d+/g, '$1');

  // Convert relative paths back to absolute (build.js will re-relativize)
  // This normalizes paths so template works from any depth
  output = output.replace(/(href|src)="(\.\.\/)+(.*?)"/g, (match, attr, dots, p) => {
    return `${attr}="/${p}"`;
  });
  output = output.replace(/(href|src)="\.\/(.*?)"/g, (match, attr, p) => {
    return `${attr}="/${p}"`;
  });

  fs.writeFileSync(filePath, output, 'utf-8');
  return { relPath, hasContent: !!contentHtml, isLanding, isDocs };
}

// Main
const files = findHtmlFiles(SRC_DIR);
let stats = { total: 0, docs: 0, landing: 0, errors: 0 };

for (const file of files) {
  try {
    const result = processFile(file);
    stats.total++;
    if (result.isDocs) stats.docs++;
    if (result.isLanding) stats.landing++;
    console.log(`  ${result.relPath} (${result.isDocs ? 'docs' : result.isLanding ? 'landing' : 'other'})`);
  } catch (err) {
    stats.errors++;
    console.error(`ERROR: ${path.relative(SRC_DIR, file)}: ${err.message}`);
  }
}

console.log(`\nDone: ${stats.total} files (${stats.docs} docs, ${stats.landing} landing, ${stats.errors} errors)`);
console.log(`Content saved to: content/en/`);
