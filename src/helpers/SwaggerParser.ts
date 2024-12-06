import axios, {AxiosResponse} from 'axios';
import ContentParsingError from '../utils/custom-errors/ContentParsingError';
import ValidationError from '../utils/custom-errors/ValidationError';
import NetworkError from '../utils/custom-errors/NetworkError';
import parseYaml from '../helpers/parseYaml';
import isValidUrl from '../helpers/isValidUrl';

// OpenAPI specific types
interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
}

interface OpenAPIServer {
  url: string;
  description?: string;
}

interface OpenAPIParameter {
  name: string;
in: string;
  description?: string;
  required?: boolean;
  schema?: any;
}

interface OpenAPIResponse {
  description: string;
  content?: Record<string, any>;
}

interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, any>;
  required?: boolean;
}

interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses?: Record<string, OpenAPIResponse>;
}

interface OpenAPIPathItem {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  trace?: OpenAPIOperation;
}

interface OpenAPIComponents {
  schemas?: Record<string, any>;
  responses?: Record<string, OpenAPIResponse>;
  parameters?: Record<string, OpenAPIParameter>;
  requestBodies?: Record<string, OpenAPIRequestBody>;
  securitySchemes?: Record<string, any>;
}

interface OpenAPITag {
  name: string;
  description?: string;
}

// Main interfaces
interface ParsedOpenAPI {
  openapi: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: Record<string, OpenAPIPathItem>;
  components?: OpenAPIComponents;
  tags?: OpenAPITag[];
}

interface Swagger2Doc {
  swagger: string;
  info: OpenAPIInfo;
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths: Record<string, OpenAPIPathItem>;
  definitions?: Record<string, any>;
  parameters?: Record<string, OpenAPIParameter>;
  responses?: Record<string, OpenAPIResponse>;
  securityDefinitions?: Record<string, any>;
  tags?: OpenAPITag[];
}

type SwaggerDoc = ParsedOpenAPI | Swagger2Doc;

class SwaggerParser {
  /**
   * Fetches raw content from URL
   */
  private static async fetchFromUrl(url: string): Promise<{
    content: string;
    contentType: string;
  }> {
    try {
      const response: AxiosResponse = await axios.get(url, {
        headers: {
          Accept: 'application/json, application/yaml, text/yaml',
        },
      });

      return {
        content:
          typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data),
        contentType: response.headers['content-type'] || '',
      };
    } catch (error: any) {
      throw new NetworkError(
        'fetchFromUrl',
        'Failed to fetch Swagger documentation',
        error
      );
    }
  }

  /**
   * Processes content string into object based on format
   */
  private static processContent(content: string): SwaggerDoc {
    try {
      // First try JSON as it's faster
      return JSON.parse(content);
    } catch (e) {
      try {
        // Then try YAML
        return parseYaml(content);
      } catch (e) {
        throw new ContentParsingError(
          'processContent',
          'Failed to parse content as JSON or YAML',
          {
            attemptedFormats: ['JSON', 'YAML'],
          }
        );
      }
    }
  }

  /**
   * Validates basic Swagger/OpenAPI structure
   */
  private static validateBasicStructure(doc: SwaggerDoc): boolean {
    const requiredFields = ['swagger', 'openapi', 'info', 'paths'];
    return requiredFields.some((field) => Object.prototype.hasOwnProperty.call(doc, field));
  }

  /**
   * Normalizes the parsed Swagger/OpenAPI document
   */
  private static normalizeDoc(doc: SwaggerDoc): ParsedOpenAPI {
    // Convert Swagger 2.0 to OpenAPI 3.0-like structure
    if ('swagger' in doc) {
      return {
        openapi: doc.swagger === '2.0' ? '3.0.0' : doc.swagger,
        info: doc.info,
        servers: doc.host
          ? [
            {
              url: `${doc.schemes?.[0] || 'https'}://${doc.host}${
                doc.basePath || ''
              }`,
            },
          ]
          : [],
        paths: doc.paths,
        components: {
          schemas: doc.definitions || {},
          parameters: doc.parameters || {},
          responses: doc.responses || {},
          securitySchemes: doc.securityDefinitions || {},
        },
        tags: doc.tags || [],
      };
    }

    // OpenAPI 3.x document
    return {
      openapi: doc.openapi,
      info: doc.info,
      servers: doc.servers || [],
      paths: doc.paths,
      components: doc.components || {},
      tags: doc.tags || [],
    };
  }

  /**
   * Resolves references in the OpenAPI document
   */
  private static resolveRefs(doc: ParsedOpenAPI): ParsedOpenAPI {
    const resolved = JSON.parse(JSON.stringify(doc));

    const resolveRef = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (obj.$ref) {
        const refPath = obj.$ref.replace('#/', '').split('/');
        let result: any = resolved;
        for (const path of refPath) {
          result = result[path];
        }
        return result;
      }

      for (const key in obj) {
        obj[key] = resolveRef(obj[key]);
      }

      return obj;
    };

    return resolveRef(resolved);
  }

  /**
   * Parses raw Swagger documentation from various formats
   */
  private static async parseToDocObject(input: string): Promise<SwaggerDoc> {
    if (!input || typeof input !== 'string') {
      throw new ValidationError('parse', 'Input is not a valid string');
    }

    let content = input;
    let contentType = '';

    if (isValidUrl(input)) {
      const response = await this.fetchFromUrl(input);
      content = response.content;
      contentType = response.contentType;
    }

    const result = this.processContent(content);

    if (!this.validateBasicStructure(result)) {
      throw new ValidationError(
        'parse',
        'Invalid Swagger/OpenAPI document structure'
      );
    }

    return result;
  }

  /**
   * Parses and normalizes Swagger/OpenAPI documentation
   */
  static async parse(input: string): Promise<any> {
    const rawDoc = await this.parseToDocObject(input);
    const normalizedDoc = this.normalizeDoc(rawDoc);
    console.log(this.resolveRefs(normalizedDoc))
    return this.transformToControllerFormat(normalizedDoc);
  }

  static transformToControllerFormat(parsedDoc: ParsedOpenAPI): any {
    const {
      info: { title: name, description = "", version },
      servers = [],
      paths,
      components = {}
    } = parsedDoc;

    const baseUrl = servers[0]?.url || "";
    const controllers: Record<string, any[]> = {};

    Object.entries(paths).forEach(([path, pathItem]) => {
      Object.entries(pathItem).forEach(([method, operation]) => {
        if (!operation) return;

        const tag = operation.tags?.[0] || "DefaultController";
        if (!controllers[tag]) {
          controllers[tag] = [];
        }

        if (operation.operationId && !operation.operationId.includes("Controller_")) {
          controllers[tag].push({
            method,
            path,
            operationId: operation.operationId,
            ...(operation.summary && { summary: operation.summary }),
            ...(operation.parameters && { parameters: operation.parameters }),
            ...(operation.requestBody && { requestBody: operation.requestBody }),
            ...(operation.responses && { responses: operation.responses }),
          });
        }
      });
    });

    return {
      controllers,
      components,
      baseUrl,
      name,
      description,
      version
    };
  }

}

export default SwaggerParser;
