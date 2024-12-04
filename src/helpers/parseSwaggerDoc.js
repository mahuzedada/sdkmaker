module.exports = function (swaggerDoc) {
  const { paths, components } = swaggerDoc;

  const controllers = {};

  Object.keys(paths).forEach((path) => {
    Object.keys(paths[path]).forEach((method) => {
      const operation = paths[path][method];
      const controllerName = operation.tags
        ? operation.tags[0]
        : "DefaultController";

      if (!controllers[controllerName]) {
        controllers[controllerName] = [];
      }

      if (
        operation.operationId &&
        !operation.operationId.includes("Controller_")
      ) {
        controllers[controllerName].push({
          method,
          path,
          operationId: operation.operationId,
          summary: operation.summary,
          parameters: operation.parameters,
          requestBody: operation.requestBody,
          responses: operation.responses,
        });
      }
    });
  });

  return { controllers, components };
};
