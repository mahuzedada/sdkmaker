import {Method} from "../types";

/**
 * Generates API methods based on OpenAPI/Swagger method configurations
 * @param {Array} methods - Array of method configurations
 * @returns {string} Generated API method definitions
 */
function generateApiMethods(methods: any) {
  return methods.map(generateMethod).join("\n\n");
}

type RequestConfig = {
  headers: Record<string, string>;
  params: Record<string, string>;
  query: Record<string, string>;
  data?: any;
  url: string;
  method: string;
};

const generateRequestConfig = (methodDef: Method): string => {
  // Initialize the configuration object
  const config: RequestConfig = {
    headers: {
      'Content-Type': methodDef.requestBody ? 'application/json' : 'application/octet-stream'
    },
    params: {},
    query: {},
    url: methodDef.path,
    method: methodDef.method
  };

  // Process parameters if they exist
  methodDef.parameters?.forEach(param => {
    if (param.parameterDetails) {
      const { name, location, required } = param.parameterDetails;

      // Create a TypeScript-friendly parameter name
      const paramName = param.modelName ? param.modelName.charAt(0).toLowerCase() + param.modelName.slice(1) : '';

      // Add parameter placeholder based on location
      switch (location.toLowerCase()) {
        case 'header':
          // Add as a required or optional header
          if (required) {
            config.headers[name] = `${getSafeVariableName(name)} ?? ''`;
          } else {
            config.headers[name] = `${getSafeVariableName(name)} ?? ''`;
          }
          break;
        case 'path':
          // Replace path parameter in URL
          config.url = config.url.replace(`{${name}}`, `\${${getSafeVariableName(name)}}`);
          break;
        case 'query':
          // Add as query parameter
          if (required) {
            config.query[name] = `${getSafeVariableName(name)} ?? ''`;
          } else {
            config.query[name] = `${getSafeVariableName(name)} ?? ''`;
          }
          break;
      }    }
  });

  // Process request body if it exists
  if (methodDef.requestBody) {
    const { schema } = methodDef.requestBody.content['application/json'];
    const bodyParamName = schema.modelName.charAt(0).toLowerCase() + schema.modelName.slice(1);
    config.data = bodyParamName;
  }

  // Generate the template literal string
  const template = `
const config:any = {
  method: '${config.method}',
  url: \`${config.url}\`,
  headers: {
${Object.entries(config.headers)
      .map(([key, value]) => `    '${key}': ${value.includes('??') ? value : `'${value}'`}`)
      .join(',\n')}
  },
${Object.keys(config.query).length > 0 ? `  params: {
${Object.entries(config.query)
      .map(([key, value]) => `    ${key}: ${value}`)
      .join(',\n')}
  },` : ''}
${config.data ? `  data: ${config.data}` : ''}
};

Object.keys(config.headers).forEach(key => {
  if (config.headers[key] === '' || config.headers[key] === null || config.headers[key] === 'null') delete config.headers[key];
});

`;

  return template;
};

/**
 * Generates a single API method definition with error handling
 * @param {Object} methodConfig - Method configuration object
 * @returns {string} Generated method definition
 */
function generateMethod(methodConfig: any) {
  const rawResponseType = generateReturnType(methodConfig.responses).replace(/Promise<(.+)>/, '$1');
  const jsDoc = generateJSDoc(methodConfig);
  const paramsString = parseParameters(methodConfig);
  const requestConfig = generateRequestConfig(methodConfig);

  return `
${jsDoc}
export async function ${methodConfig.operationId}(${paramsString}): Promise<ApiResponse<${rawResponseType}>> {
  try {
    ${requestConfig}
    let axiosInstance = axiosClient.getInstance();
    const h = axiosInstance.defaults.headers;
    const bUrl = axiosInstance.defaults.baseURL;
      const cleanHeaders = Object.fromEntries(
          Object.entries(h).filter(([_, value]) => value !== null && value !== 'Bearer null' && value !== 'null')
      );
      axiosClient.setInstance(axios.create({baseURL: bUrl, headers: cleanHeaders}));
      axiosInstance = axiosClient.getInstance();

    const axiosResponse = await axiosInstance(config);
    return axiosResponse.data;
  } catch (error: any) {
    return error?.response?.data ?? error;
  }
}`;
}


/**
 * Generates a Promise-based return type signature from OpenAPI response object
 */
const generateReturnType = (responses: {
  [statusCode: string]: {
    description: string;
    content?: {
      'application/json'?: {
        schema: {
          modelName: string;
          type: string;
          items: any;
          refType: string;
          isReference: boolean;
        };
      };
    };
  };
}): string => {
  // Look for 200 or 201 success responses with JSON content
  const successResponse = responses['default'] || responses['200'] || responses['201'];

  if (successResponse?.content?.['application/json']?.schema) {
    const { modelName, type, items } = successResponse.content['application/json'].schema;
    return `Promise<${type === 'array'? 'Array<': ''}${modelName ?? items?.modelName ?? 'any'}${type === 'array'? '>' : ''}>`;
  }

  // If no JSON schema is found but there is a success response, return void
  if (successResponse) {
    return 'Promise<void>';
  }

  // Default case if no success response is defined
  return 'Promise<unknown>';
};

/**
 * Parses method parameters and request body
 * @param {Object} method - Method configuration
 * @returns {Array<{name: string, type: string}>} Parsed parameters
 */
export function parseParameters(method: any) {
  const {requestBody,parameters } = method;
  const parts: string[] = [];
  if (requestBody) {
    const bodyParam = convertRequestBodyToParam(requestBody);
    if (bodyParam) {
      parts.push(bodyParam);
    }
  }

  if (parameters && parameters.length > 0) {
    const paramsString = convertToFunctionParams(parameters);
    if (paramsString) {
      parts.push(paramsString);
    }
  }

  return parts.join(', ');
}

/**
 * Generates JSDoc documentation for an API method
 */
const generateJSDoc = (config: {
  summary?: string;
  parameters?: Array<{
    modelName: string | null;
    refType: string;
    isReference: boolean;
    parameterDetails?: {
      name: string;
      location: string;
      required: boolean;
      format?: string;
    };
  }>;
  requestBody?: {
    content: {
      'application/json': {
        schema: {
          modelName: string;
          refType: string;
          isReference: boolean;
        };
      };
    };
    required?: boolean;
  };
}): string => {
  const lines: string[] = [];

  // Start JSDoc block
  lines.push('/**');

  // Add summary if provided
  if (config.summary) {
    lines.push(` * ${config.summary}`);
    lines.push(` *`);
  }

  // Add request body documentation if exists
  if (config.requestBody?.content?.['application/json']?.schema) {
    const { modelName } = config.requestBody.content['application/json'].schema;
    const required = config.requestBody.required ?? false;
    const paramName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    lines.push(` * @param {${modelName}} ${paramName}${required ? '' : ' [Optional]'} - Request body`);
  }

  // Add parameter documentation
  if (config.parameters) {
    config.parameters.forEach(param => {
      if (!param.parameterDetails) return;

      const { name, location, required, format } = param.parameterDetails;

      // Create safe parameter name
      const safeName = name
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/^(\d)/, '_$1')
          .toLowerCase();

      // Determine type based on format
      let type = 'string';
      if (format === 'date') {
        type = 'Date';
      }

      // Build parameter description
      const description = `${location} parameter${format ? ` (${format})` : ''}`;

      lines.push(` * @param {${type}} ${safeName}${required ? '' : ' [Optional]'} - ${description}`);
    });
  }

  lines.push(` */`);

  return lines.join('\n');
};

function getSafeVariableName(name: string) {
  return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^(\d)/, '_$1')
      .toLowerCase()
}
function getSafeTypeName(name: string) {

}
/**
 * Converts OpenAPI parameter objects to function parameter strings
 */
const convertToFunctionParams = (parameters: Array<{
  modelName: string | null;
  refType: string;
  isReference: boolean;
  parameterDetails?: {
    name: string;
    type: string;
    location: string;
    required: boolean;
    format?: string;
  };
}>): string => {
  return parameters
      .sort((p1, p2) => {
        if (p1.parameterDetails?.required && !p2.parameterDetails?.required) {
          return -1
        }
        if (!p1.parameterDetails?.required && p2.parameterDetails?.required) {
          return 1
        }
        return 0
      })
      .map(param => {
        if (!param.parameterDetails) return '';

        const { name, required } = param.parameterDetails;
        // Sanitize the name to be a valid variable name
        const safeName = getSafeVariableName(name);

        // Add type annotation based on format or default to string
        let typeAnnotation = 'string';
        if (param.parameterDetails.format === 'date') {
          typeAnnotation = 'Date';
        }
        if (param.parameterDetails.type === 'integer') {
          typeAnnotation = 'number';
        }

        // Add optional marker if not required
        const optionalMarker = required ? '' : '?';

        return `${safeName}${optionalMarker}: ${typeAnnotation}`;
      })
      .filter(Boolean)
      .join(', ');
};

/**
 * Converts OpenAPI request body object to a function parameter string
 */
const convertRequestBodyToParam = (requestBody: {
  content: {
    'application/json': {
      schema: {
        modelName: string;
        refType: string;
        isReference: boolean;
      };
    };
  };
  required?: boolean;
}): string => {
  if (!requestBody?.content?.['application/json']?.schema) {
    return '';
  }

  const { schema } = requestBody.content['application/json'];
  const required = requestBody.required ?? false;

  // Use the model name as the parameter name, but convert to camelCase
  const paramName = schema.modelName.charAt(0).toLowerCase() +
      schema.modelName.slice(1);

  // Add optional marker if not required
  const optionalMarker = required ? '' : '?';

  return `${paramName}${optionalMarker}: ${schema.modelName}`;
};

export default generateApiMethods;
