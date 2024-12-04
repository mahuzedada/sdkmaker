const getRequestBodyType = require("./getRequestBodyType");
const getResponseType = require("./getResponseType");

/**
 * Generates API methods based on OpenAPI/Swagger method configurations
 * @param {Array} methods - Array of method configurations
 * @returns {string} Generated API method definitions
 */
function generateApiMethods(methods) {
  return methods.map(generateMethod).join("\n\n");
}

/**
 * Generates a single API method definition
 * @param {Object} methodConfig - Method configuration object
 * @returns {string} Generated method definition
 */
function generateMethod(methodConfig) {
  const parameters = parseParameters(methodConfig);
  const responseType = getResponseType(methodConfig.responses);
  const paramsList = parameters.map((p) => `${p.name}: ${p.type}`).join(", ");

  return `
/**
 * ${methodConfig.summary}${buildJsDocParams(parameters)}
 */
export async function ${methodConfig.operationId}(${paramsList}): Promise<${responseType}> {
  const axiosInstance = axiosClient.getInstance();
  const response = await axiosInstance({
    url: \`${methodConfig.path.replaceAll("{", "${")}\`,
    method: '${methodConfig.method.toUpperCase()}',${
      methodConfig.requestBody ? "\n    data," : ""
    }
  });
  return response.data;
}`;
}

/**
 * Parses method parameters and request body
 * @param {Object} method - Method configuration
 * @returns {Array<{name: string, type: string}>} Parsed parameters
 */
function parseParameters(method) {
  const params =
    method.parameters?.map((p) => ({
      name: p.name,
      type: p.schema.type,
    })) || [];

  if (method.requestBody) {
    params.push({
      name: "data",
      type: getRequestBodyType(method.requestBody),
    });
  }

  return params;
}

/**
 * Builds JSDoc parameter documentation
 * @param {Array<{name: string, type: string}>} args - Method parameters
 * @returns {string} Formatted JSDoc parameters
 */
function buildJsDocParams(args) {
  return args.length
    ? `\n ${args
        .map(({ name, type }) => `* @param {${type}} ${name}`)
        .join("\n ")}`
    : "";
}

module.exports = generateApiMethods;
