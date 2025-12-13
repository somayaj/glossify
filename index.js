/**
 * Glossify - Annotation Parser Utility Library
 * Handles annotations in the format: @name value{body}
 */

class Glossify {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register a handler for a specific annotation type
   * @param {string} annotationType - The annotation name (e.g., 'function', 'route')
   * @param {Function} handler - Callback function(value, body, context)
   */
  register(annotationType, handler) {
    this.handlers.set(annotationType, handler);
    return this;
  }

  /**
   * Parse a string and extract all annotations
   * @param {string} source - The source string to parse
   * @returns {Array} Array of parsed annotation objects
   */
  parse(source) {
    const annotations = [];
    const regex = /@(\w+)\s*([^{]*?)\s*\{/g;
    let match;

    while ((match = regex.exec(source)) !== null) {
      const name = match[1];
      const value = match[2].trim();
      const startIndex = match.index;
      const bodyStart = match.index + match[0].length;

      // Find matching closing brace
      const body = this._extractBody(source, bodyStart);

      if (body !== null) {
        annotations.push({
          name,
          value,
          body: body.content,
          start: startIndex,
          end: body.endIndex + 1,
          raw: source.substring(startIndex, body.endIndex + 1)
        });
      }
    }

    return annotations;
  }

  /**
   * Extract body content handling nested braces
   * @private
   */
  _extractBody(source, startIndex) {
    let depth = 1;
    let index = startIndex;
    let content = '';

    while (index < source.length && depth > 0) {
      const char = source[index];

      if (char === '{') {
        depth++;
        content += char;
      } else if (char === '}') {
        depth--;
        if (depth > 0) {
          content += char;
        }
      } else {
        content += char;
      }

      index++;
    }

    if (depth !== 0) {
      return null; // Unbalanced braces
    }

    return {
      content: content.trim(),
      endIndex: index - 1
    };
  }

  /**
   * Parse and execute registered handlers for annotations
   * @param {string} source - The source string to parse
   * @param {Object} context - Optional context object passed to handlers
   * @returns {Array} Array of handler results
   */
  execute(source, context = {}) {
    const annotations = this.parse(source);
    const results = [];

    for (const annotation of annotations) {
      const handler = this.handlers.get(annotation.name);

      if (handler) {
        const result = handler(annotation.value, annotation.body, context);
        results.push({
          annotation: annotation.name,
          value: annotation.value,
          result
        });
      }
    }

    return results;
  }

  /**
   * Parse nested annotations within a body
   * @param {string} body - The body content to parse for nested annotations
   * @returns {Array} Array of nested annotation objects
   */
  parseNested(body) {
    return this.parse(body);
  }

  /**
   * Extract a specific annotation type from source
   * @param {string} source - The source string
   * @param {string} annotationType - The annotation type to find
   * @returns {Array} Array of matching annotations
   */
  find(source, annotationType) {
    return this.parse(source).filter(a => a.name === annotationType);
  }

  /**
   * Check if source contains a specific annotation
   * @param {string} source - The source string
   * @param {string} annotationType - The annotation type to check
   * @returns {boolean}
   */
  has(source, annotationType) {
    return this.find(source, annotationType).length > 0;
  }

  /**
   * Transform source by replacing annotations with handler output
   * @param {string} source - The source string
   * @param {Object} context - Optional context
   * @returns {string} Transformed source
   */
  transform(source, context = {}) {
    const annotations = this.parse(source);
    let result = source;
    let offset = 0;

    for (const annotation of annotations) {
      const handler = this.handlers.get(annotation.name);

      if (handler) {
        const replacement = handler(annotation.value, annotation.body, context);

        if (typeof replacement === 'string') {
          const start = annotation.start + offset;
          const end = annotation.end + offset;

          result = result.substring(0, start) + replacement + result.substring(end);
          offset += replacement.length - (annotation.end - annotation.start);
        }
      }
    }

    return result;
  }
}

/**
 * Create annotation pattern for custom parsing
 * @param {string} name - Annotation name
 * @returns {RegExp}
 */
function createPattern(name) {
  return new RegExp(`@${name}\\s*([^{]*?)\\s*\\{`, 'g');
}

/**
 * Quick parse without instantiating Glossify
 * @param {string} source - Source to parse
 * @returns {Array} Parsed annotations
 */
function parse(source) {
  const glossify = new Glossify();
  return glossify.parse(source);
}

/**
 * Quick find specific annotation type
 * @param {string} source - Source to parse
 * @param {string} annotationType - Type to find
 * @returns {Array} Matching annotations
 */
function find(source, annotationType) {
  const glossify = new Glossify();
  return glossify.find(source, annotationType);
}

// ============================================
// API Documentation Generator
// ============================================

class APIDocGenerator {
  constructor(options = {}) {
    this.glossify = new Glossify();
    this.controllers = [];
    this.options = {
      title: options.title || 'API Documentation',
      version: options.version || '1.0.0',
      description: options.description || ''
    };
  }

  /**
   * Parse source and extract controllers/routes
   * @param {string} source - Source containing @controller and @route annotations
   * @returns {Array} Parsed controllers
   */
  parse(source) {
    const controllers = this.glossify.find(source, 'controller');

    this.controllers = controllers.map(controller => {
      const routes = this._parseRoutes(controller.body);
      return {
        name: controller.value,
        routes
      };
    });

    return this.controllers;
  }

  /**
   * Parse routes from controller body
   * @private
   */
  _parseRoutes(controllerBody) {
    const routes = [];
    const routeAnnotations = this.glossify.find(controllerBody, 'route');

    for (const route of routeAnnotations) {
      const [method, path] = route.value.split(' ');
      const routeDetails = this._parseRouteDetails(route.body);

      routes.push({
        method,
        path,
        ...routeDetails
      });
    }

    return routes;
  }

  /**
   * Parse route details (description, params, body, responses)
   * @private
   */
  _parseRouteDetails(routeBody) {
    const details = {
      description: '',
      params: [],
      body: null,
      responses: []
    };

    // Parse description
    const descriptions = this.glossify.find(routeBody, 'description');
    if (descriptions.length > 0) {
      details.description = descriptions[0].body;
    }

    // Parse params
    const params = this.glossify.find(routeBody, 'param');
    for (const param of params) {
      details.params.push({
        name: param.value,
        description: param.body,
        in: 'path'
      });
    }

    // Parse request body
    const bodies = this.glossify.find(routeBody, 'body');
    if (bodies.length > 0) {
      details.body = bodies[0].body;
    }

    // Parse responses
    const responses = this.glossify.find(routeBody, 'response');
    for (const response of responses) {
      details.responses.push({
        status: response.value,
        example: response.body
      });
    }

    // Parse query params
    const queries = this.glossify.find(routeBody, 'query');
    if (queries.length > 0) {
      const queryParams = this.glossify.find(queries[0].body, 'param');
      for (const qp of queryParams) {
        details.params.push({
          name: qp.value,
          description: qp.body,
          in: 'query'
        });
      }
    }

    return details;
  }

  /**
   * Generate Markdown documentation
   * @returns {string} Markdown formatted documentation
   */
  toMarkdown() {
    let md = `# ${this.options.title}\n\n`;
    if (this.options.description) {
      md += `${this.options.description}\n\n`;
    }
    md += '_Generated by Glossify_\n\n';
    md += '---\n\n';

    for (const controller of this.controllers) {
      md += `## ${controller.name}\n\n`;

      for (const route of controller.routes) {
        md += `### \`${route.method}\` ${route.path}\n\n`;

        if (route.description) {
          md += `${route.description}\n\n`;
        }

        if (route.params.length > 0) {
          md += '**Parameters:**\n\n';
          md += '| Name | Location | Description |\n';
          md += '|------|----------|-------------|\n';
          for (const param of route.params) {
            md += `| \`${param.name}\` | ${param.in} | ${param.description} |\n`;
          }
          md += '\n';
        }

        if (route.body) {
          md += '**Request Body:**\n\n';
          md += '```json\n' + route.body + '\n```\n\n';
        }

        if (route.responses.length > 0) {
          md += '**Responses:**\n\n';
          for (const response of route.responses) {
            md += `- **${response.status}**:\n`;
            md += '```json\n' + response.example + '\n```\n\n';
          }
        }

        md += '---\n\n';
      }
    }

    return md;
  }

  /**
   * Generate OpenAPI 3.0 specification
   * @returns {Object} OpenAPI spec object
   */
  toOpenAPI() {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: this.options.title,
        version: this.options.version,
        description: this.options.description
      },
      paths: {}
    };

    for (const controller of this.controllers) {
      for (const route of controller.routes) {
        const pathKey = route.path;

        if (!spec.paths[pathKey]) {
          spec.paths[pathKey] = {};
        }

        spec.paths[pathKey][route.method.toLowerCase()] = {
          summary: route.description,
          tags: [controller.name],
          parameters: route.params.map(p => ({
            name: p.name,
            in: p.in,
            description: p.description,
            required: p.in === 'path'
          })),
          responses: route.responses.reduce((acc, res) => {
            acc[res.status] = {
              description: res.example
            };
            return acc;
          }, {})
        };

        if (route.body) {
          spec.paths[pathKey][route.method.toLowerCase()].requestBody = {
            content: {
              'application/json': {
                example: route.body
              }
            }
          };
        }
      }
    }

    return spec;
  }

  /**
   * Generate OpenAPI JSON string
   * @param {number} indent - JSON indentation (default: 2)
   * @returns {string} JSON string
   */
  toOpenAPIJson(indent = 2) {
    return JSON.stringify(this.toOpenAPI(), null, indent);
  }

  /**
   * Get all routes as flat array
   * @returns {Array} All routes with controller info
   */
  getRoutes() {
    const routes = [];
    for (const controller of this.controllers) {
      for (const route of controller.routes) {
        routes.push({
          controller: controller.name,
          ...route
        });
      }
    }
    return routes;
  }

  /**
   * Get summary statistics
   * @returns {Object} Summary object
   */
  getSummary() {
    return {
      controllers: this.controllers.length,
      routes: this.controllers.reduce((sum, c) => sum + c.routes.length, 0),
      methods: this.getRoutes().reduce((acc, r) => {
        acc[r.method] = (acc[r.method] || 0) + 1;
        return acc;
      }, {})
    };
  }
}

/**
 * Quick API doc generation from source
 * @param {string} source - Source to parse
 * @param {Object} options - Generator options
 * @returns {APIDocGenerator} Generator instance
 */
function createDocs(source, options = {}) {
  const generator = new APIDocGenerator(options);
  generator.parse(source);
  return generator;
}

// ============================================
// API Server
// ============================================

const http = require('http');
const fs = require('fs');
const path = require('path');

class GlossifyServer {
  constructor(options = {}) {
    this.glossify = new Glossify();
    this.port = options.port || 3000;
    this.routes = [];
    this.handlers = new Map();
    this.server = null;
    this.data = options.data || {};
  }

  /**
   * Load routes from a .gsf file
   * @param {string} filePath - Path to the .gsf file
   * @returns {GlossifyServer} this
   */
  loadFile(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    return this.load(source);
  }

  /**
   * Load routes from source string
   * @param {string} source - Source containing route annotations
   * @returns {GlossifyServer} this
   */
  load(source) {
    const controllers = this.glossify.find(source, 'controller');

    for (const controller of controllers) {
      const routeAnnotations = this.glossify.find(controller.body, 'route');

      for (const route of routeAnnotations) {
        const [method, routePath] = route.value.split(' ');
        const descriptions = this.glossify.find(route.body, 'description');
        const responses = this.glossify.find(route.body, 'response');

        this.routes.push({
          method: method.toUpperCase(),
          path: routePath,
          controller: controller.value,
          description: descriptions[0]?.body || '',
          responses: responses.map(r => ({
            status: parseInt(r.value),
            example: r.body
          }))
        });
      }
    }

    return this;
  }

  /**
   * Register a handler for a specific route
   * @param {string} method - HTTP method
   * @param {string} routePath - Route path
   * @param {Function} handler - Handler function(req, res, params, body)
   * @returns {GlossifyServer} this
   */
  handle(method, routePath, handler) {
    const key = `${method.toUpperCase()}:${routePath}`;
    this.handlers.set(key, handler);
    return this;
  }

  /**
   * Register handlers for all routes in a controller
   * @param {string} controllerName - Controller name
   * @param {Object} handlers - Object with method:path keys and handler functions
   * @returns {GlossifyServer} this
   */
  controller(controllerName, handlers) {
    for (const [key, handler] of Object.entries(handlers)) {
      this.handlers.set(key, handler);
    }
    return this;
  }

  /**
   * Set shared data accessible to handlers
   * @param {string} key - Data key
   * @param {any} value - Data value
   * @returns {GlossifyServer} this
   */
  setData(key, value) {
    this.data[key] = value;
    return this;
  }

  /**
   * Match incoming request to a route
   * @private
   */
  _matchRoute(method, urlPath) {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      // Convert route path to regex (handle :param patterns)
      const pattern = route.path
        .replace(/:[^/]+/g, '([^/]+)')
        .replace(/\//g, '\\/');

      const regex = new RegExp(`^${pattern}$`);
      const match = urlPath.match(regex);

      if (match) {
        // Extract params
        const paramNames = (route.path.match(/:[^/]+/g) || []).map(p => p.slice(1));
        const params = {};
        paramNames.forEach((name, i) => {
          params[name] = match[i + 1];
        });

        return { route, params };
      }
    }

    return null;
  }

  /**
   * Default handler when no custom handler is registered
   * @private
   */
  _defaultHandler(route, params) {
    // Return the first response example if available
    if (route.responses.length > 0) {
      const response = route.responses[0];
      try {
        return {
          status: response.status,
          data: JSON.parse(response.example)
        };
      } catch {
        return {
          status: response.status,
          data: response.example
        };
      }
    }

    return {
      status: 200,
      data: { message: `${route.method} ${route.path}`, params }
    };
  }

  /**
   * Start the server
   * @param {Function} callback - Optional callback when server starts
   * @returns {Promise<GlossifyServer>} this
   */
  start(callback) {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        const url = new URL(req.url, `http://localhost:${this.port}`);
        const method = req.method;
        const urlPath = url.pathname;

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        if (method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Match route
        const matched = this._matchRoute(method, urlPath);

        if (!matched) {
          res.writeHead(404);
          res.end(JSON.stringify({
            error: 'Route not found',
            availableRoutes: this.routes.map(r => `${r.method} ${r.path}`)
          }));
          return;
        }

        // Parse body for POST/PUT/PATCH
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let parsedBody = {};
          try {
            if (body) parsedBody = JSON.parse(body);
          } catch (e) {}

          const handlerKey = `${matched.route.method}:${matched.route.path}`;
          const handler = this.handlers.get(handlerKey);

          let result;
          if (handler) {
            // Custom handler
            result = handler({
              params: matched.params,
              body: parsedBody,
              query: Object.fromEntries(url.searchParams),
              data: this.data,
              route: matched.route
            });
          } else {
            // Default handler - return response example
            result = this._defaultHandler(matched.route, matched.params);
          }

          // Handle promise results
          Promise.resolve(result).then(r => {
            const status = r?.status || 200;
            const data = r?.data !== undefined ? r.data : r;

            this._log(method, urlPath, status);

            res.writeHead(status);
            res.end(data !== null ? JSON.stringify(data, null, 2) : '');
          }).catch(err => {
            this._log(method, urlPath, 500);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
          });
        });
      });

      this.server.listen(this.port, () => {
        this._printStartup();
        if (callback) callback(this);
        resolve(this);
      });
    });
  }

  /**
   * Stop the server
   * @returns {Promise<void>}
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Log request
   * @private
   */
  _log(method, path, status) {
    const colors = {
      GET: '\x1b[32m',
      POST: '\x1b[33m',
      PUT: '\x1b[34m',
      DELETE: '\x1b[31m',
      PATCH: '\x1b[35m'
    };
    const color = colors[method] || '';
    const reset = '\x1b[0m';
    const statusColor = status < 400 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${method.padEnd(7)}${reset} ${path} → ${statusColor}${status}${reset}`);
  }

  /**
   * Print startup message
   * @private
   */
  _printStartup() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║         Glossify API Server               ║');
    console.log('╚══════════════════════════════════════════╝\n');

    console.log('📍 Registered Routes:\n');
    for (const route of this.routes) {
      const colors = {
        GET: '\x1b[32m',
        POST: '\x1b[33m',
        PUT: '\x1b[34m',
        DELETE: '\x1b[31m',
        PATCH: '\x1b[35m'
      };
      const color = colors[route.method] || '';
      const reset = '\x1b[0m';
      console.log(`   ${color}${route.method.padEnd(7)}${reset} http://localhost:${this.port}${route.path}`);
    }

    console.log(`\n🚀 Server running at http://localhost:${this.port}\n`);
  }

  /**
   * Get all registered routes
   * @returns {Array} Routes array
   */
  getRoutes() {
    return this.routes;
  }
}

/**
 * Create and start a server from a .gsf file
 * @param {string} filePath - Path to .gsf file
 * @param {Object} options - Server options
 * @returns {Promise<GlossifyServer>} Server instance
 */
async function createServer(filePath, options = {}) {
  const server = new GlossifyServer(options);
  server.loadFile(filePath);
  await server.start();
  return server;
}

/**
 * Create server from source string
 * @param {string} source - Source containing route annotations
 * @param {Object} options - Server options
 * @returns {GlossifyServer} Server instance (not started)
 */
function createServerFromSource(source, options = {}) {
  const server = new GlossifyServer(options);
  server.load(source);
  return server;
}

module.exports = {
  Glossify,
  parse,
  find,
  createPattern,
  APIDocGenerator,
  createDocs,
  GlossifyServer,
  createServer,
  createServerFromSource
};

