const yaml = require("js-yaml");
const ValidationError = require("../utils/custom-errors/ValidationError");

const parseYaml = (content) => {
  if (!content || typeof content !== "string") {
    throw new Error("YAML content must be a non-empty string");
  }

  const parsed = yaml.load(content);

  // Check if parsing resulted in undefined/null
  if (parsed === undefined || parsed === null) {
    throw new ValidationError("parseYaml", "YAML content is empty or invalid");
  }

  // Additional validation that the result is an object/array
  if (typeof parsed !== "object") {
    throw new ValidationError(
      "parseYaml",
      "YAML content must resolve to an object or array",
    );
  }

  return parsed;
};

module.exports = parseYaml;
