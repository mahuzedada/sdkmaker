const getEnumName = require("./getEnumName");
module.exports = function generateEnums(schemas) {
  return Object.keys(schemas)
    .flatMap((schemaName) => {
      const schema = schemas[schemaName];
      return Object.keys(schema.properties)
        .filter((property) => schema.properties[property].enum)
        .map((property) => {
          const enumValues = schema.properties[property].enum;
          const enumName = getEnumName(schemaName, property);
          const enumDefinition = `
export type ${enumName} = ${enumValues.map((item) => `'${item}'`).join(" | ")};`;
          return enumDefinition.trim();
        });
    })
    .join("\n\n");
};
