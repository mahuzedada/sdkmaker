const ValidationError = require("../utils/custom-errors/ValidationError");

/**
 * Generates an API aggregator that combines multiple controller modules into a single export.
 *
 * @param {Object.<string, Array>} controllers - An object mapping controller names to their endpoints
 * @returns {string} Generated code that imports and re-exports all controllers
 * @throws {TypeError} If controllers argument is not an object
 *
 * @example
 * const controllers = {
 *   users: ['getUser', 'createUser'],
 *   auth: ['login', 'logout']
 * };
 * const result = generateApiAggregator(controllers);
 */
const generateApiAggregator = (controllers) => {
  if (typeof controllers !== "object" || controllers === null) {
    throw new ValidationError("Controllers must be a non-null object");
  }

  const activeControllers = Object.entries(controllers)
    .filter(
      ([_, endpoints]) => Array.isArray(endpoints) && endpoints.length > 0,
    )
    .map(([name]) => name);

  if (activeControllers.length === 0) {
    return "";
  }

  const imports = activeControllers
    .map((name) => `import * as ${name} from './${name}';`)
    .join("\n");

  const exports = activeControllers.map((name) => `  ...${name}`).join(",\n");

  return `
${imports}

export default {
${exports}
};
`.trim();
};

module.exports = generateApiAggregator;
