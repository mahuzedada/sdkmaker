module.exports = function getEnumName(schemaName, property) {
  return `${schemaName.replace("Dto", "").replace("Create", "").replace("Get", "")}${property.charAt(0).toUpperCase() + property.slice(1)}Enum`;
};
