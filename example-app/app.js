/**
 * Glossify Example App
 * Demonstrates using glossify's built-in API documentation generator
 */

const fs = require('fs');
const path = require('path');
const { createDocs } = require('glossify');

// ============================================
// Run the Example
// ============================================

console.log('╔══════════════════════════════════════════╗');
console.log('║      Glossify Example App                 ║');
console.log('║      API Documentation Generator         ║');
console.log('╚══════════════════════════════════════════╝\n');

// Read the routes definition file
const routesFile = path.join(__dirname, 'routes.gsf');
const source = fs.readFileSync(routesFile, 'utf8');

console.log('📄 Parsing routes.gsf...\n');

// Create docs using the built-in generator
const docs = createDocs(source, {
  title: 'My API',
  version: '1.0.0',
  description: 'API generated from Glossify annotations'
});

// Display parsed structure
console.log('📦 Parsed Controllers:\n');
for (const controller of docs.controllers) {
  console.log(`  └─ ${controller.name}`);
  for (const route of controller.routes) {
    const methodColors = {
      GET: '\x1b[32m',
      POST: '\x1b[33m',
      PUT: '\x1b[34m',
      DELETE: '\x1b[31m',
      PATCH: '\x1b[35m'
    };
    const color = methodColors[route.method] || '\x1b[0m';
    const reset = '\x1b[0m';
    console.log(`      ├─ ${color}${route.method.padEnd(7)}${reset} ${route.path}`);
    if (route.description) {
      console.log(`      │     └─ ${route.description}`);
    }
  }
  console.log('');
}

// Generate and save markdown documentation
console.log('📝 Generating Markdown Documentation...\n');
const markdown = docs.toMarkdown();
const mdPath = path.join(__dirname, 'API_DOCS.md');
fs.writeFileSync(mdPath, markdown);
console.log(`   ✅ Saved to: ${mdPath}\n`);

// Generate and save OpenAPI spec
console.log('📋 Generating OpenAPI Spec...\n');
const openapi = docs.toOpenAPIJson();
const jsonPath = path.join(__dirname, 'openapi.json');
fs.writeFileSync(jsonPath, openapi);
console.log(`   ✅ Saved to: ${jsonPath}\n`);

// Show summary
const summary = docs.getSummary();
console.log('═══════════════════════════════════════════');
console.log('Summary:');
console.log(`  • Controllers: ${summary.controllers}`);
console.log(`  • Total Routes: ${summary.routes}`);
console.log(`  • Methods: ${Object.entries(summary.methods).map(([k, v]) => `${k}(${v})`).join(', ')}`);
console.log('═══════════════════════════════════════════\n');

console.log('🎉 Done! Check API_DOCS.md for the generated documentation.');
