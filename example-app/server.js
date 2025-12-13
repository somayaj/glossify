/**
 * Glossify API Server Example
 * Demonstrates using glossify's built-in server functionality
 */

const path = require('path');
const { createServer, GlossifyServer } = require('glossify');

// ============================================
// Option 1: Quick Start (uses response examples from .gsf file)
// ============================================

// Just one line to start a server!
// createServer(path.join(__dirname, 'routes.gsf'), { port: 3000 });

// ============================================
// Option 2: With Custom Handlers
// ============================================

const server = new GlossifyServer({ port: 3000 });

// Mock data
const data = {
  users: [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
    { id: 3, name: 'Bob', email: 'bob@example.com' }
  ],
  products: [
    { id: 1, name: 'Widget', price: 9.99 },
    { id: 2, name: 'Gadget', price: 19.99 },
    { id: 3, name: 'Gizmo', price: 29.99 }
  ]
};

// Load routes from .gsf file
server.loadFile(path.join(__dirname, 'routes.gsf'));

// Set shared data
server.setData('users', data.users);
server.setData('products', data.products);

// Register custom handlers - if needed 
server.handle('GET', '/users', ({ data }) => {
  return { status: 200, data: data.users };
});

server.handle('GET', '/users/:id', ({ params, data }) => {
  const user = data.users.find(u => u.id === parseInt(params.id));
  if (!user) return { status: 404, data: { error: 'User not found' } };
  return { status: 200, data: user };
});

server.handle('POST', '/users', ({ body, data }) => {
  const newUser = {
    id: data.users.length + 1,
    ...body
  };
  data.users.push(newUser);
  return { status: 201, data: { ...newUser, message: 'User created successfully' } };
});

server.handle('PUT', '/users/:id', ({ params, body, data }) => {
  const index = data.users.findIndex(u => u.id === parseInt(params.id));
  if (index === -1) return { status: 404, data: { error: 'User not found' } };
  data.users[index] = { ...data.users[index], ...body };
  return { status: 200, data: { message: 'User updated successfully' } };
});

server.handle('DELETE', '/users/:id', ({ params, data }) => {
  const index = data.users.findIndex(u => u.id === parseInt(params.id));
  if (index === -1) return { status: 404, data: { error: 'User not found' } };
  data.users.splice(index, 1);
  return { status: 204, data: null };
});

server.handle('GET', '/products', ({ data, query }) => {
  let products = data.products;
  const limit = parseInt(query.limit) || products.length;
  const offset = parseInt(query.offset) || 0;
  products = products.slice(offset, offset + limit);
  return { status: 200, data: { products, total: data.products.length } };
});

server.handle('GET', '/products/:id', ({ params, data }) => {
  const product = data.products.find(p => p.id === parseInt(params.id));
  if (!product) return { status: 404, data: { error: 'Product not found' } };
  return { status: 200, data: product };
});

// Start the server
server.start(() => {
  console.log('Try these commands:\n');
  console.log(`   curl http://localhost:3000/users`);
  console.log(`   curl http://localhost:3000/users/1`);
  console.log(`   curl http://localhost:3000/products`);
  console.log(`   curl http://localhost:3000/products?limit=2`);
  console.log(`   curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d '{"name":"Alice","email":"alice@example.com"}'`);
  console.log('\nPress Ctrl+C to stop the server.\n');
});
