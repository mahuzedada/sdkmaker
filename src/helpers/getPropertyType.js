const getEnumName = require("./getEnumName");

module.exports = function getPropertyType(schema, schemaName, property) {
  const propertySchema = schema.properties[property];

  if (propertySchema.enum) {
    return getEnumName(schemaName, property);
  }

  if (propertySchema.type === "array") {
    const itemSchema = propertySchema.items;

    // Handle reference types (e.g., $ref: "#/components/schemas/SomeType")
    if (itemSchema.$ref) {
      const refType = itemSchema.$ref.split("/").pop();
      return `Array<${refType}>`;
    }

    // Handle direct types (e.g., type: "string")
    if (itemSchema.type) {
      return `Array<${itemSchema.type}>`;
    }

    // Fallback to any if no type information is available
    return "Array<any>";
  }

  return propertySchema.type;
};
