/**
 * Fix broken links in converted Markdown files.
 * Maps non-existent page references to actual pages or removes them.
 */
import fs from 'fs';
import path from 'path';

const DOCS_DIR = path.resolve('docs');

// Map broken link targets to actual pages
const LINK_REPLACEMENTS = {
  // Core references that don't exist
  '../../../docs/reference/core/caching': '/docs/reference/core/overview',
  '../../../docs/reference/core/observability': '/docs/reference/core/overview',

  // IAM references
  '../../../docs/reference/iam/admin-dashboard': '/docs/reference/iam/admin',
  '../../../docs/reference/iam/e2e-workflow': '/docs/reference/iam/end-to-end-workflow',
  '../../../docs/reference/iam/policy-management': '/docs/reference/iam/policy',

  // Identity references that don't exist - map to closest
  '../../../docs/reference/identity/auth-context': '/docs/reference/identity/authentication',
  '../../../docs/reference/identity/auth-urls': '/docs/reference/identity/authentication',
  '../../../docs/reference/identity/mfa-factors': '/docs/reference/identity/mfa',
  '../../../docs/reference/identity/mfa-lifecycle': '/docs/reference/identity/mfa',
  '../../../docs/reference/identity/mfa-monitoring': '/docs/reference/identity/mfa',
  '../../../docs/reference/identity/mfa-security': '/docs/reference/identity/mfa',
  '../../../docs/reference/identity/mfa-session': '/docs/reference/identity/mfa',
  '../../../docs/reference/identity/mfa-state-machine': '/docs/reference/identity/mfa',
  '../../../docs/reference/identity/oauth2-token': '/docs/reference/identity/authentication',
  '../../../docs/reference/identity/otp': '/docs/reference/identity/mfa',
  '../../../docs/reference/identity/state-machine': '/docs/reference/identity/state-management',
  '/docs/reference/identity/zero-trust-filters': '/docs/reference/identity/dsl',

  // Security references (section doesn't exist)
  '../../../docs/reference/security/hcad': '/docs/reference/architecture/overview',
  '../../../docs/reference/security/shadow-mode': '/docs/install/shadow-mode',
  '../../../docs/reference/security/soar': '/docs/reference/soar/index',
  '../../../docs/reference/security/zero-trust': '/docs/reference/architecture/zero-trust-flow',

  // Reference index
  '../../../docs/reference/index': '/docs/reference/architecture/overview',
  '../../../docs/reference/soar/index': '/docs/reference/soar/index',

  // Configuration anchors - fix paths
  '../../../docs/install/configuration#contexa-core': '/docs/install/configuration#contexa-core',
  '../../../docs/install/configuration#pgvector': '/docs/install/configuration#pgvector',
  '../../../docs/install/configuration#session': '/docs/install/configuration#session',
  '../../../docs/install/configuration#zero-trust': '/docs/install/configuration#zero-trust',

  // Relative links within same directory
  'index': './index',
};

function findMdFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findMdFiles(fullPath));
    else if (entry.name.endsWith('.md')) results.push(fullPath);
  }
  return results;
}

function fixLinks(content) {
  let fixed = content;

  // Apply all link replacements
  for (const [broken, replacement] of Object.entries(LINK_REPLACEMENTS)) {
    // Escape special regex chars in the broken link
    const escaped = broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\]\\(${escaped}\\)`, 'g');
    fixed = fixed.replace(regex, `](${replacement})`);
  }

  // Fix ko locale specific links
  fixed = fixed.replace(/\]\(\/ko\/docs\//g, '](/docs/');

  // Remove broken anchor-only links that reference non-existent sections
  // These are usually fine as anchors - Docusaurus just warns about them

  return fixed;
}

function main() {
  const files = findMdFiles(DOCS_DIR);
  console.log(`Processing ${files.length} files for link fixes...\n`);

  let modified = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf-8');
    const fixed = fixLinks(original);

    if (fixed !== original) {
      fs.writeFileSync(file, fixed, 'utf-8');
      modified++;
      console.log(`  Fixed: ${path.relative(DOCS_DIR, file)}`);
    }
  }

  console.log(`\nDone! Modified ${modified} files.`);
}

main();
