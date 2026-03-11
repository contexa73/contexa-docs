/**
 * MDX Post-Processing Cleanup Script
 * Removes artifacts from HTML → Markdown conversion:
 * - Breadcrumb navigation lines
 * - Orphaned step numbers (1, 2, 3...)
 * - "Copy" text from code blocks
 * - Broken relative links (../../index, etc.)
 * - Duplicate page titles
 */
import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.resolve('docs');

function findMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMdFiles(fullPath));
    else if (entry.name.endsWith('.md')) results.push(fullPath);
  }
  return results;
}

function cleanupContent(content, filePath) {
  let lines = content.split('\n');
  let cleaned = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip breadcrumb lines like "[Home](../../index) / [Install](...) / Quick Start"
    if (trimmed.match(/^\[.+\]\(.+\)\s*\/\s*\[.+\]\(.+\)/)) {
      i++;
      // Skip blank line after breadcrumb
      if (i < lines.length && lines[i].trim() === '') i++;
      continue;
    }

    // Skip orphaned step numbers (line is just a number like "1", "2", "3")
    if (trimmed.match(/^\d+$/) && parseInt(trimmed) <= 20) {
      i++;
      // Skip blank line after step number
      if (i < lines.length && lines[i].trim() === '') i++;
      continue;
    }

    // Remove "Copy" text that appears after code block language labels
    // Pattern: "Language Copy" → "Language" or just "Copy" on its own line
    if (trimmed === 'Copy') {
      i++;
      continue;
    }

    // Clean "Gradle (Kotlin DSL) Copy" → remove the line entirely (it's a tab label)
    if (trimmed.match(/^(Gradle|Maven|YAML|Properties|Java|Kotlin|Groovy|XML|JSON|Bash|Shell|SQL)(\s*\(.*\))?\s+Copy$/)) {
      i++;
      // Skip blank line after
      if (i < lines.length && lines[i].trim() === '') i++;
      continue;
    }

    // Also handle label-only lines (without Copy) that are tab labels before code blocks
    if (trimmed.match(/^(Gradle \(Kotlin DSL\)|Gradle \(Groovy\)|Maven|application\.yml|application\.properties)$/) &&
        i + 1 < lines.length && lines[i + 1].trim().startsWith('```')) {
      i++;
      continue;
    }

    // Remove duplicate H1 if it matches the frontmatter title
    // (frontmatter title already handles the page title in Docusaurus)
    // Keep H1 for now - Docusaurus handles deduplication

    // Fix broken relative links
    let fixedLine = line;
    // ../../index → / (home)
    fixedLine = fixedLine.replace(/\]\(\.\.\/\.\.\/index\)/g, '](/)');
    // ../../docs/install/index → /docs/install/
    fixedLine = fixedLine.replace(/\]\(\.\.\/\.\.\/docs\//g, '](/docs/');
    // ../reference/ relative links
    fixedLine = fixedLine.replace(/\]\(\.\.\/reference\//g, '](/docs/reference/');
    // Remove .html from links
    fixedLine = fixedLine.replace(/\.html([)#])/g, '$1');

    cleaned.push(fixedLine);
    i++;
  }

  // Remove excessive blank lines (more than 2 consecutive)
  let result = cleaned.join('\n');
  result = result.replace(/\n{4,}/g, '\n\n\n');

  // Trim trailing whitespace
  result = result.replace(/[ \t]+$/gm, '');

  return result;
}

function main() {
  const files = findMdFiles(DOCS_DIR);
  console.log(`Processing ${files.length} markdown files...\n`);

  let modified = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf-8');
    const cleaned = cleanupContent(original, file);

    if (cleaned !== original) {
      fs.writeFileSync(file, cleaned, 'utf-8');
      modified++;
      const rel = path.relative(DOCS_DIR, file);
      console.log(`  Cleaned: ${rel}`);
    }
  }

  console.log(`\nDone! Modified ${modified} of ${files.length} files.`);
}

main();
