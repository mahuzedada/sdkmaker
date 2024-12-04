module.exports = function getResponseType(responses) {
  if (
    responses["default"] &&
    responses["default"].content["application/json"]
  ) {
    const schema = responses["default"].content["application/json"].schema;
    if (schema.$ref) {
      return `models.${schema.$ref.split("/").pop()}`;
    } else if (schema.type === "array" && schema.items) {
      if (schema.items.$ref) {
        return `models.${schema.items.$ref.split("/").pop()}[]`;
      } else {
        return "any[]";
      }
    } else if (schema.type === "object") {
      return "Record<string, any>";
    }
  }
  return "any";
};
