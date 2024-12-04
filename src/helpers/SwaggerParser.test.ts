import SwaggerParser from './SwaggerParser';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import ContentParsingError from '../utils/custom-errors/ContentParsingError';
import ValidationError from '../utils/custom-errors/ValidationError';
import NetworkError from '../utils/custom-errors/NetworkError';

describe('SwaggerParser', () => {
  // Sample valid Swagger docs for testing
  const mockSwaggerDoc = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {
      '/test': {
        get: {
          operationId: 'getTest',
          tags: ['TestController'],
          summary: 'Test endpoint',
          parameters: [{ name: 'id', in: 'query' }],
          responses: { '200': { description: 'OK' } }
        },
        post: {
          operationId: 'Controller_postTest', // Should be filtered out
          tags: ['TestController']
        }
      }
    },
    components: {
      schemas: {
        Test: { type: 'object' }
      }
    }
  };

  const validSwaggerYaml = `
    openapi: '3.0.0'
    info:
      title: Test API
      version: 1.0.0
    paths:
      /test:
        get:
          operationId: getTest
          tags:
            - TestController
  `;

  // Setup MSW server
  const server = setupServer(
    // JSON response
    http.get('https://api.example.com/docs', () => {
      return HttpResponse.json(mockSwaggerDoc);
    }),

    // YAML response
    http.get('https://api.example.com/docs-yaml', () => {
      return new HttpResponse(validSwaggerYaml, {
        headers: {
          'Content-Type': 'application/yaml'
        }
      });
    }),

    // Network error simulation
    http.get('https://api.error.com/docs', () => {
      return HttpResponse.error();
    }),

    // Different content types
    http.get('https://api.example.com/docs-string', () => {
      return new HttpResponse(JSON.stringify(mockSwaggerDoc), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    })
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('parse', () => {
    it('should parse JSON string input', async () => {
      const result = await SwaggerParser.parse(JSON.stringify(mockSwaggerDoc));

      expect(result).toHaveProperty('controllers');
      expect(result).toHaveProperty('components');
      expect(result.controllers).toHaveProperty('TestController');
      expect(result.controllers.TestController).toHaveLength(1);
      expect(result.controllers.TestController[0]).toMatchObject({
        method: 'get',
        path: '/test',
        operationId: 'getTest',
        summary: 'Test endpoint'
      });
      // Controller_postTest should be filtered out
      expect(result.controllers.TestController).not.toContainEqual(
        expect.objectContaining({ operationId: 'Controller_postTest' })
      );
    });

    it('should parse YAML string input', async () => {
      const result = await SwaggerParser.parse(validSwaggerYaml);

      expect(result).toHaveProperty('controllers');
      expect(result.controllers).toHaveProperty('TestController');
      expect(result.controllers.TestController[0]).toHaveProperty('operationId', 'getTest');
    });

    it('should parse from URL input', async () => {
      const result = await SwaggerParser.parse('https://api.example.com/docs');

      expect(result).toHaveProperty('controllers');
      expect(result.controllers).toHaveProperty('TestController');
      expect(result.controllers.TestController).toHaveLength(1);
    });

    it('should include API metadata in the result', async () => {
      const result = await SwaggerParser.parse(JSON.stringify(mockSwaggerDoc));

      expect(result).toHaveProperty('name', 'Test API');
      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('baseUrl');
      expect(result).toHaveProperty('description');
    });

    it('should throw ValidationError for invalid input', async () => {
      await expect(SwaggerParser.parse(null as any)).rejects.toThrow(ValidationError);
      await expect(SwaggerParser.parse(123 as any)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid swagger structure', async () => {
      const invalidSwagger = JSON.stringify({ invalid: true });
      await expect(SwaggerParser.parse(invalidSwagger)).rejects.toThrow(ValidationError);
    });

    it('should handle network errors', async () => {
      await expect(SwaggerParser.parse('https://api.error.com/docs')).rejects.toThrow(NetworkError);
    });

    it('should parse different content types correctly', async () => {
      const result = await SwaggerParser.parse('https://api.example.com/docs-string');

      expect(result).toHaveProperty('controllers');
      expect(result.controllers).toHaveProperty('TestController');
      expect(result.controllers.TestController).toHaveLength(1);
    });
  });
});
