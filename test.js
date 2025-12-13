/**
 * Glossify Test File
 */

const { Glossify, parse, find } = require('./index');

// Test source with annotations
const source = `
@function greet {
  console.log("Hello, World!");
}

@route /api/users {
  @method GET {
    return getAllUsers();
  }
  
  @method POST {
    return createUser(body);
  }
}

@component Button {
  <button class="primary">Click me</button>
}
`;

console.log('=== Glossify Annotation Parser Tests ===\n');

// Test 1: Basic parsing
console.log('1. Basic Parse:');
const annotations = parse(source);
console.log(`   Found ${annotations.length} annotations:`);
annotations.forEach(a => {
  console.log(`   - @${a.name} ${a.value}`);
});

// Test 2: Find specific annotation
console.log('\n2. Find @function annotations:');
const functions = find(source, 'function');
functions.forEach(f => {
  console.log(`   - @function ${f.value}`);
  console.log(`     Body: ${f.body}`);
});

// Test 3: Using Glossify with handlers
console.log('\n3. Using handlers:');
const glossify = new Glossify();

glossify.register('function', (name, body) => {
  console.log(`   Processing function: ${name}`);
  console.log(`   Body: ${body}`);
  return { name, body };
});

glossify.register('route', (path, body) => {
  console.log(`   Processing route: ${path}`);
  return { path, body };
});

const results = glossify.execute(source);
console.log(`   Executed ${results.length} handlers`);

// Test 4: Nested annotations
console.log('\n4. Nested annotations:');
const routes = find(source, 'route');
if (routes.length > 0) {
  const nested = glossify.parseNested(routes[0].body);
  console.log(`   Found ${nested.length} nested annotations in @route:`);
  nested.forEach(n => {
    console.log(`   - @${n.name} ${n.value}`);
  });
}

// Test 5: Transform
console.log('\n5. Transform source:');
const simpleSource = '@uppercase hello{ world }';
const transformer = new Glossify();
transformer.register('uppercase', (value, body) => {
  return `${value.toUpperCase()}: ${body.toUpperCase()}`;
});
const transformed = transformer.transform(simpleSource);
console.log(`   Original: ${simpleSource}`);
console.log(`   Transformed: ${transformed}`);

console.log('\n=== All tests completed! ===');

