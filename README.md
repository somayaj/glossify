# glossify

A powerful annotation parser and API framework for Node.js. Define your APIs using simple annotations and let Glossify handle the rest.

## Installation

```bash
npm install glossify
```

## Quick Start

### 1. Define Your Routes (`routes.gsf`)

```
@controller UserController {

  @route GET /users {
    @description { Get all users }
    @response 200 {
      [{ "id": 1, "name": "John" }]
    }
  }

  @route GET /users/:id {
    @description { Get user by ID }
    @param id { User's unique identifier }
    @response 200 {
      { "id": 1, "name": "John", "email": "john@example.com" }
    }
  }

  @route POST /users {
    @description { Create a new user }
    @body {
      { "name": "string", "email": "string" }
    }
    @response 201 {
      { "id": 1, "message": "User created" }
    }
  }

}
```

### 2. Start Your Server

```javascript
const { createServer } = require('glossify');

// One line to start your API server!
createServer('./routes.gsf', { port: 3000 });
```

## Features

- 🚀 **Annotation-based routing** - Define APIs with simple, readable annotations
- 📄 **Auto-documentation** - Generate Markdown and OpenAPI specs automatically
- 🔧 **Flexible parsing** - Create custom annotations for any use case
- 🌐 **Built-in server** - Start an HTTP server directly from route definitions
- 🎯 **Zero dependencies** - Uses only Node.js built-in modules

## API Reference

### Core Parser

#### `Glossify`

The core annotation parser class.

```javascript
const { Glossify } = require('glossify');

const glossify = new Glossify();

// Register a handler for an annotation type
glossify.register('myAnnotation', (value, body, context) => {
  console.log(`Value: ${value}, Body: ${body}`);
  return { processed: true };
});

// Parse source and execute handlers
const results = glossify.execute(`
  @myAnnotation hello {
    world
  }
`);
```

**Methods:**

| Method | Description |
|--------|-------------|
| `register(type, handler)` | Register handler for annotation type |
| `parse(source)` | Parse all annotations from source |
| `execute(source, context)` | Parse and run registered handlers |
| `find(source, type)` | Find specific annotation type |
| `has(source, type)` | Check if annotation exists |
| `transform(source, context)` | Replace annotations with handler output |
| `parseNested(body)` | Parse nested annotations in body |

#### Quick Functions

```javascript
const { parse, find } = require('glossify');

// Quick parse
const annotations = parse('@hello world { body }');

// Quick find
const hellos = find(source, 'hello');
```

---

### API Documentation Generator

#### `APIDocGenerator`

Generate documentation from route annotations.

```javascript
const { APIDocGenerator } = require('glossify');

const generator = new APIDocGenerator({
  title: 'My API',
  version: '1.0.0',
  description: 'API documentation'
});

generator.parse(source);

// Generate Markdown
const markdown = generator.toMarkdown();

// Generate OpenAPI 3.0 spec
const openapi = generator.toOpenAPI();
const openapiJson = generator.toOpenAPIJson();
const openapiYaml = generator.toOpenAPIYaml();

// Generate Swagger 2.0 spec (legacy compatibility)
const swagger = generator.toSwagger2();
const swaggerJson = generator.toSwagger2Json();
const swaggerYaml = generator.toSwagger2Yaml();

// Get summary
const summary = generator.getSummary();
// { controllers: 2, routes: 7, methods: { GET: 4, POST: 2, DELETE: 1 } }
```

#### Quick Function

```javascript
const { createDocs } = require('glossify');

const docs = createDocs(source, { title: 'My API' });
console.log(docs.toMarkdown());
```

---

### API Server

#### `GlossifyServer`

Create an HTTP server from route annotations.

```javascript
const { GlossifyServer } = require('glossify');

const server = new GlossifyServer({ port: 3000 });

// Load routes from file
server.loadFile('./routes.gsf');

// Or load from string
server.load(source);

// Set shared data
server.setData('users', [{ id: 1, name: 'John' }]);

// Register custom handlers
server.handle('GET', '/users', ({ data, query }) => {
  return { status: 200, data: data.users };
});

server.handle('GET', '/users/:id', ({ params, data }) => {
  const user = data.users.find(u => u.id === parseInt(params.id));
  if (!user) return { status: 404, data: { error: 'Not found' } };
  return { status: 200, data: user };
});

server.handle('POST', '/users', ({ body, data }) => {
  const newUser = { id: data.users.length + 1, ...body };
  data.users.push(newUser);
  return { status: 201, data: newUser };
});

// Start server
server.start();
```

**Handler Context:**

| Property | Description |
|----------|-------------|
| `params` | URL path parameters (e.g., `:id`) |
| `body` | Parsed JSON request body |
| `query` | Query string parameters |
| `data` | Shared data from `setData()` |
| `route` | Matched route information |

#### Quick Function

```javascript
const { createServer } = require('glossify');

// Start server with one line (uses response examples as mock data)
createServer('./routes.gsf', { port: 3000 });
```

---

## Supported Annotations

| Annotation | Format | Description |
|------------|--------|-------------|
| `@controller` | `@controller Name { ... }` | Group routes under a controller |
| `@route` | `@route METHOD /path { ... }` | Define an API endpoint |
| `@description` | `@description { text }` | Route description |
| `@param` | `@param name { description }` | Path or query parameter |
| `@body` | `@body { schema }` | Request body schema |
| `@response` | `@response STATUS { example }` | Response example |
| `@query` | `@query { @param ... }` | Query parameters container |

---

## How It Works

### Architecture Overview

glossify separates **API structure** (defined in `.gsf` files) from **business logic** (defined in JavaScript handlers).

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   routes.gsf    │ ──▶ │   glossify     │ ──▶ │   HTTP Server   │
│  (API Schema)   │     │    (Parser)      │     │   (Runtime)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │  Documentation   │
                        │ (Markdown/OpenAPI)│
                        └──────────────────┘
```

### Defining Controllers

Controllers are defined in `.gsf` files using the `@controller` annotation:

```
@controller UserController {

  @route GET /users {
    @description { Get all users }
    @response 200 {
      [{ "id": 1, "name": "John" }]
    }
  }

  @route POST /users {
    @description { Create a user }
    @body { { "name": "string" } }
    @response 201 { { "id": 1 } }
  }

}
```

### How Parsing Works

When you call `server.loadFile('./routes.gsf')`, glossify:

1. **Reads** the `.gsf` file
2. **Finds** all `@controller` annotations
3. **Extracts** nested `@route` annotations from each controller
4. **Parses** route metadata (`@description`, `@param`, `@response`, etc.)
5. **Registers** routes with the HTTP server

```javascript
// This is what happens internally:
const controllers = glossify.find(source, 'controller');

for (const controller of controllers) {
  const routes = glossify.find(controller.body, 'route');
  // Register each route...
}
```

### Adding Business Logic

The `.gsf` file defines the API structure, but you add the actual logic with handlers:

```javascript
const { GlossifyServer } = require('glossify');

const server = new GlossifyServer({ port: 3000 });

// 1. Load API structure from .gsf file
server.loadFile('./routes.gsf');

// 2. Set up shared data (database, services, etc.)
server.setData('users', [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
]);

// 3. Add business logic handlers
server.handle('GET', '/users', ({ data }) => {
  return { status: 200, data: data.users };
});

server.handle('POST', '/users', ({ body, data }) => {
  const newUser = { id: Date.now(), ...body };
  data.users.push(newUser);
  return { status: 201, data: newUser };
});

// 4. Start the server
server.start();
```

### Mock Mode (No Handlers)

If you don't register a handler, glossify automatically returns the `@response` example from the `.gsf` file. This is great for prototyping:

```javascript
const { createServer } = require('glossify');

// Starts server using @response examples as mock data
createServer('./routes.gsf', { port: 3000 });
```

---

## Custom Annotations

Create your own annotations for any use case:

```javascript
const { Glossify } = require('glossify');

const glossify = new Glossify();

// Template annotation
glossify.register('template', (name, body) => {
  return `<div class="${name}">${body}</div>`;
});

// Config annotation
glossify.register('config', (key, value) => {
  return { [key]: JSON.parse(value) };
});

// Transform source
const html = glossify.transform(`
  @template card {
    <h1>Hello World</h1>
  }
`);
// Output: <div class="card"><h1>Hello World</h1></div>
```

## Examples

### Generate API Documentation

```javascript
const fs = require('fs');
const { createDocs } = require('glossify');

const source = fs.readFileSync('./routes.gsf', 'utf8');
const docs = createDocs(source, {
  title: 'My API',
  version: '2.0.0'
});

// Save Markdown docs
fs.writeFileSync('./API.md', docs.toMarkdown());

// Save OpenAPI spec (JSON)
fs.writeFileSync('./openapi.json', docs.toOpenAPIJson());

// Save OpenAPI spec (YAML)
fs.writeFileSync('./openapi.yaml', docs.toOpenAPIYaml());

// Save Swagger 2.0 spec (for legacy tools)
fs.writeFileSync('./swagger.yaml', docs.toSwagger2Yaml());

console.log(docs.getSummary());
```

### Full Server Example

```javascript
const { GlossifyServer } = require('glossify');

const server = new GlossifyServer({ port: 3000 });

server.loadFile('./routes.gsf');

// In-memory database
server.setData('db', {
  users: [],
  nextId: 1
});

server.handle('GET', '/users', ({ data }) => ({
  status: 200,
  data: data.db.users
}));

server.handle('POST', '/users', ({ body, data }) => {
  const user = { id: data.db.nextId++, ...body };
  data.db.users.push(user);
  return { status: 201, data: user };
});

server.handle('DELETE', '/users/:id', ({ params, data }) => {
  const idx = data.db.users.findIndex(u => u.id === parseInt(params.id));
  if (idx === -1) return { status: 404, data: { error: 'Not found' } };
  data.db.users.splice(idx, 1);
  return { status: 204, data: null };
});

server.start(() => {
  console.log('Server ready!');
});
```

## License

MIT License - Copyright (c) 2025 Asha Somayajula

See [LICENSE](./LICENSE) for details.

