module.exports = function getRequestBodyType(requestBody) {
  if (
    !requestBody ||
    !requestBody.content ||
    !requestBody.content["application/json"]
  ) {
    return "any";
  }

  const ref = requestBody.content["application/json"].schema.$ref;
  if (ref) {
    const typeName = ref.split("/").pop();
    return `models.${typeName}`;
  }

  return "any";
};
