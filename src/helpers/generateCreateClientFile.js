const getRequestBodyType = require("./getRequestBodyType");
const getResponseType = require("./getResponseType");

module.exports = function generateCreateClientFile({
  controllers,
  name,
  defaultBaseUrl,
}) {
  const controllerMethods = Object.keys(controllers)
    .map((controllerName) => {
      return controllers[controllerName]
        .map((method) => {
          const params = method.parameters
            ? method.parameters
                .map((param) => `${param.name}: ${param.schema.type}`)
                .join(", ")
            : "";
          const paramsToPass = method.parameters
            ? method.parameters.map((param) => `${param.name}`).join(", ")
            : "";
          const requestBodyType = getRequestBodyType(method.requestBody);
          const responseType = getResponseType(method.responses);
          const requestBodyParam = method.requestBody
            ? `data: ${requestBodyType}`
            : "";
          const requestBodyParamToPass = method.requestBody ? `data` : "";

          const args = [];
          const argumentsToPass = [];
          if (params) args.push(params);
          if (requestBodyParam) args.push(requestBodyParam);
          if (paramsToPass) argumentsToPass.push(paramsToPass);
          if (requestBodyParamToPass)
            argumentsToPass.push(requestBodyParamToPass);

          return `
  async function ${method.operationId}(${args.join(
    ", ",
  )}): Promise<ApiResponse<${responseType}>> {
    try {
      const response = await API.${method.operationId}(${argumentsToPass.join(", ")});
      return {
        data: response,
        error: null,
        isBusy: false,
      };
    } catch (error) {
      return ErrorResponse(error instanceof Error ? error.message : "An unknown error occurred");
    }
  }`;
        })
        .join("\n");
    })
    .join("\n");

  return `import axios from "axios";
import * as models from "./models";
import axiosClient from "./axiosClient";
import API from './API';

export interface ${name.replace(" ", '')}Config {
  apiKey?: string;
  authToken?: string;
  baseURL?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isBusy: boolean;
}

export function createClient({ apiKey, authToken, baseURL = '${defaultBaseUrl}' }: ${name.replace(" ", '')}Config) {
  const headers: any = {};
  if (authToken) {
    headers['Authorization'] = \`Bearer \${authToken}\`;
  }
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  axiosClient.setInstance(axios.create({
    baseURL,
    headers,
  }));

  function ErrorResponse(error: string) {
    return {
      error,
      data: null,
      isBusy: false,
    };
  }

  ${controllerMethods}

  return {
    ${Object.keys(controllers)
      .filter((controllerName) => !!controllers[controllerName].length)
      .map((controllerName) =>
        controllers[controllerName]
          .map((method) => `${method.operationId}`)
          .join(",\n    "),
      )
      .join(",\n    ")}
  };
}
`;
};
