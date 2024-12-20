import axios, {AxiosResponse} from 'axios';
import ContentParsingError from '../utils/custom-errors/ContentParsingError';
import ValidationError from '../utils/custom-errors/ValidationError';
import NetworkError from '../utils/custom-errors/NetworkError';
import parseYaml from '../helpers/parseYaml';
import isValidUrl from '../helpers/isValidUrl';
import { isAbsolute, resolve } from 'path';
import { readFileSync } from 'fs';

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
   * Resolves references in the OpenAPI document, preserving reference names and extracting parameter details
   * @param doc The parsed OpenAPI document
   * @returns The document with resolved references and parameter information
   */
  private static resolveRefs(doc: ParsedOpenAPI): ParsedOpenAPI {
    const resolved = JSON.parse(JSON.stringify(doc));

    interface ParameterInfo {
      modelName: string | null;
      refType: 'parameter' | 'schema' | 'other';
      isReference: boolean;
      parameterDetails?: {
        name: string;
        location: 'path' | 'query' | 'header';
        required: boolean;
        format?: string;
      };
    }

    const getRefInfo = (ref: string): { name: string; type: 'parameter' | 'schema' | 'other' } => {
      const parts = ref.split('/');
      const name = parts[parts.length - 1];

      if (parts.includes('parameters')) {
        return { name, type: 'parameter' };
      } else if (parts.includes('schemas')) {
        return { name, type: 'schema' };
      }
      return { name, type: 'other' };
    };

    const extractParameterInfo = (paramDef: any, refName: string | null = null): ParameterInfo | any => {
      // If it's a parameter definition (either inline or referenced)
      if (paramDef.in && paramDef.name && paramDef.schema) {
        if (paramDef.schema.type === 'string' || paramDef.schema.type === 'integer') {
          return {
            modelName: refName,
            refType: 'parameter',
            isReference: !!refName,
            parameterDetails: {
              name: paramDef.name,
              type: paramDef.schema.type,
              location: paramDef.in as 'path' | 'query' | 'header',
              required: !!paramDef.required,
              format: paramDef.schema.format
            }
          };
        }
      }
      return paramDef;
    };

    const resolveRef = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      // Handle arrays specifically for parameters
      if (Array.isArray(obj)) {
        return obj.map(item => resolveRef(item));
      }

      if (obj.$ref) {
        const { name, type } = getRefInfo(obj.$ref);

        // Get the referenced definition
        if (type === 'parameter') {
          const refPath = obj.$ref.replace('#/', '').split('/');
          let paramDef: any = resolved;
          for (const path of refPath) {
            paramDef = paramDef[path];
          }
          return extractParameterInfo(paramDef, name);
        }

        // Default return for non-parameters
        return {
          modelName: name,
          refType: type,
          isReference: true
        };
      }

      // Handle inline parameters
      if (obj.in && obj.name && obj.schema) {
        return extractParameterInfo(obj);
      }

      // Recursively process all properties
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
    else if (!isAbsolute(input) &&
        !(input.includes('openapi:') ||
            input.includes('"openapi":') ||
            input.includes('swagger:') ||
            input.includes('"swagger":'))) {
      try {
        const absolutePath = resolve(input);
        content = readFileSync(absolutePath, 'utf-8');
      } catch (error: any) {
        throw new ValidationError(
            'parse',
            `Failed to read OpenAPI file: ${error.message}`
        );
      }
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
    const docWithResolvedRefs = this.resolveRefs(normalizedDoc);
    const controllerFormat = this.transformToControllerFormat(normalizedDoc);
    const controllerFormatWithoutRef = this.transformToControllerFormat(docWithResolvedRefs);
    console.log(docWithResolvedRefs);
    console.log(controllerFormat);
    return controllerFormatWithoutRef;
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
