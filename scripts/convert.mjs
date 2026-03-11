/**
 * HTML → MDX Converter for Contexa Documentation
 * Converts contexa-website HTML docs to Docusaurus MDX format.
 */
import fs from 'fs';
import path from 'path';
import { load } from 'cheerio';
import TurndownService from 'turndown';

const SOURCE_DIR = path.resolve('..', 'contexa-website', 'docs');
const TARGET_DIR = path.resolve('docs');

// Title overrides for clean display
const TITLE_MAP = {
  'quickstart': 'Quick Start',
  'installation-guide': 'Installation Guide',
  'configuration': 'Configuration',
  'shadow-mode': 'Shadow Mode',
  'spring-boot': 'Spring Boot Integration',
  'overview': 'Overview',
  'zero-trust-flow': 'Zero Trust Flow',
  'dsl': 'Identity DSL',
  'authentication': 'Authentication',
  'mfa': 'Multi-Factor Authentication',
  'session': 'Session Management',
  'asep': 'ASEP (Adaptive Security Enforcement Point)',
  'state-management': 'State Management',
  'xacml': 'XACML Policy Engine',
  'protectable': '@Protectable Annotation',
  'admin': 'Policy Administration',
  'policy': 'Policy Management',
  'dynamic-authorization': 'Dynamic Authorization',
  'ai-security-expressions': 'AI Security Expressions',
  'permission-evaluators': 'Permission Evaluators',
  'resource-scanner': 'Resource Scanner',
  'end-to-end-workflow': 'End-to-End Workflow',
  'ai-lab': 'AI Lab',
  'pipeline': 'AI Pipeline',
  'streaming': 'Streaming',
  'llm-orchestrator': 'LLM Orchestrator',
  'model-provider': 'Model Provider',
  'advisor': 'Security Advisor',
  'rag': 'RAG (Retrieval-Augmented Generation)',
  'strategy': 'Strategy Engine',
  'approval': 'Approval Workflow',
  'soar-tool': '@SoarTool Annotation',
  'ai': 'AI Configuration',
  'iam': 'IAM Configuration',
  'identity': 'Identity Configuration',
  'infrastructure': 'Infrastructure Configuration',
  'security': 'Security Configuration',
};

function getTitleFromFilename(filename) {
  const base = path.basename(filename, '.html');
  if (base === 'index') {
    const parentDir = path.basename(path.dirname(filename));
    return TITLE_MAP[parentDir] || parentDir.charAt(0).toUpperCase() + parentDir.slice(1);
  }
  return TITLE_MAP[base] || base.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function createTurndownService() {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  });

  // Preserve code block language
  td.addRule('codeBlock', {
    filter: (node) => node.nodeName === 'PRE' && node.querySelector('code'),
    replacement: (content, node) => {
      const code = node.querySelector('code');
      const classNames = code.getAttribute('class') || '';
      const langMatch = classNames.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : '';
      const text = code.textContent.replace(/\n$/, '');
      return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
    },
  });

  // Convert callout divs to admonitions
  td.addRule('callout', {
    filter: (node) => {
      if (node.nodeName !== 'DIV') return false;
      const cls = node.getAttribute('class') || '';
      return cls.includes('callout');
    },
    replacement: (content, node) => {
      const cls = node.getAttribute('class') || '';
      let type = 'note';
      if (cls.includes('callout-warning')) type = 'warning';
      else if (cls.includes('callout-danger')) type = 'danger';
      else if (cls.includes('callout-info')) type = 'info';
      else if (cls.includes('callout-tip')) type = 'tip';
      else if (cls.includes('callout-success')) type = 'tip';

      // Get title if present
      const titleEl = node.querySelector('.callout-title');
      const title = titleEl ? ` ${titleEl.textContent.trim()}` : '';

      // Get content (strip title if present)
      let bodyContent = content.trim();
      if (titleEl) {
        bodyContent = bodyContent.replace(titleEl.textContent.trim(), '').trim();
      }

      return `\n:::${type}${title}\n${bodyContent}\n:::\n`;
    },
  });

  // Remove sidebar blocks (they're part of the Docusaurus sidebar now)
  td.addRule('sidebar', {
    filter: (node) => {
      const cls = node.getAttribute('class') || '';
      return cls.includes('docs-sidebar') || cls.includes('sidebar-toggle') || cls.includes('sidebar-overlay');
    },
    replacement: () => '',
  });

  // Remove script and style tags
  td.addRule('removeScripts', {
    filter: ['script', 'style', 'link'],
    replacement: () => '',
  });

  // Remove header/footer includes
  td.addRule('removeIncludes', {
    filter: (node) => {
      const dataInclude = node.getAttribute('data-include');
      return !!dataInclude;
    },
    replacement: () => '',
  });

  return td;
}

function convertHtmlToMdx(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = load(html);

  // Extract page title
  let title = $('title').text().trim();
  // Clean title - remove "Contexa | " or " - Contexa" suffixes
  title = title.replace(/\s*[-|]\s*Contexa.*$/i, '').replace(/^Contexa\s*[-|]\s*/i, '').trim();

  if (!title) {
    title = getTitleFromFilename(htmlPath);
  }

  // Try to extract content from .docs-content-inner first, then .docs-content, then body
  let contentHtml = '';
  const contentInner = $('.docs-content-inner');
  const docsContent = $('.docs-content');

  if (contentInner.length) {
    contentHtml = contentInner.html();
  } else if (docsContent.length) {
    contentHtml = docsContent.html();
  } else {
    // Fallback: extract from body, removing known layout elements
    $('header, footer, .docs-sidebar, .sidebar-toggle, .sidebar-overlay, nav, script, style, link').remove();
    $('[data-include]').remove();
    contentHtml = $('body').html() || $.html();
  }

  if (!contentHtml || !contentHtml.trim()) {
    console.log(`  [SKIP] Empty content: ${htmlPath}`);
    return null;
  }

  // Convert HTML to Markdown
  const td = createTurndownService();
  let markdown = td.turndown(contentHtml);

  // Clean up excessive blank lines
  markdown = markdown.replace(/\n{4,}/g, '\n\n\n');

  // Fix internal links: remove .html extension, adjust paths
  markdown = markdown.replace(/\]\(([^)]*?)\.html\)/g, ']($1)');

  // Build frontmatter
  const frontmatter = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    '---',
    '',
  ].join('\n');

  return frontmatter + markdown;
}

function getRelativePath(htmlPath) {
  return path.relative(SOURCE_DIR, htmlPath).replace(/\\/g, '/');
}

function getTargetPath(htmlPath) {
  const rel = getRelativePath(htmlPath);
  // Convert .html to .mdx
  const mdxPath = rel.replace(/\.html$/, '.mdx');
  return path.join(TARGET_DIR, mdxPath);
}

function processAll() {
  const htmlFiles = findHtmlFiles(SOURCE_DIR);

  console.log(`Found ${htmlFiles.length} HTML files to convert.\n`);

  let converted = 0;
  let skipped = 0;

  for (const htmlFile of htmlFiles) {
    const rel = getRelativePath(htmlFile);
    const targetPath = getTargetPath(htmlFile);

    console.log(`Converting: ${rel}`);

    try {
      const mdx = convertHtmlToMdx(htmlFile);
      if (!mdx) {
        skipped++;
        continue;
      }

      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      fs.mkdirSync(targetDir, { recursive: true });

      fs.writeFileSync(targetPath, mdx, 'utf-8');
      converted++;
      console.log(`  -> ${path.relative(TARGET_DIR, targetPath)}`);
    } catch (err) {
      console.error(`  [ERROR] ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nDone! Converted: ${converted}, Skipped: ${skipped}`);
}

function findHtmlFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findHtmlFiles(fullPath));
    } else if (entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }

  return results;
}

processAll();
