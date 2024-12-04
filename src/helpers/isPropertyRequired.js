module.exports = function isPropertyRequired(schema, property) {
  return schema.required && schema.required.includes(property);
};
