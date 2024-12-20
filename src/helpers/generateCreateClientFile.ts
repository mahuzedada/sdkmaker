import getRequestBodyType from "./getRequestBodyType";
import getResponseType from "./getResponseType";
import generateApiMethods, {parseParameters} from "./generateApiMethods";
import {generateModelsList} from "../makeSdk";
import writeToFile from "./writeToFile";

function extractParameterNames(parameterString: string): string[] {
    const regex = /(\w+)\s*\??:\s*[^,]+/g;

    const parameterNames: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(parameterString)) !== null) {
        parameterNames.push(match[1]);
    }

    return parameterNames;
}

export default function generateCreateClientFile({
  controllers,
  name,
  defaultBaseUrl,
}: any) {
  const controllerMethods = Object.keys(controllers)
    .map((controllerName) => {
      return controllers[controllerName]
        .map((method: any) => {
          const params: any = method.parameters
            ? method.parameters
                .map((param: any) => `${param.name}: ${param.schema?.type ?? 'any'}`)
                .join(", ")
            : "";

          const requestBodyType = getRequestBodyType(method.requestBody);
          const responseType = getResponseType(method.responses);
          const requestBodyParam = method.requestBody
            ? `data: ${requestBodyType}`
            : "";

          const args = [];
          if (params) args.push(params);
          if (requestBodyParam) args.push(requestBodyParam);


          return `
  async function ${method.operationId}(${parseParameters(method)}) {
      return await API.${method.operationId}(${extractParameterNames(parseParameters(method))});
  }`;
        })
        .join("\n");
    })
    .join("\n");

    const modelList = (Object.entries(controllers) as any[])
        .filter(([_, methods]) => methods.length > 0)
        .map(([controllerName, methods]) => {
            return generateModelsList(methods).split(',\n');
        }).flat().filter((item, index, list) => item.length && (list.indexOf(item) === index)).join(',\n');



  return `import axios from "axios";
import {
ApiResponse,
${modelList}
} from './models';

import axiosClient from "./axiosClient";
import API from './API';

export interface ${name.replace(" ", '')}Config {
  apiKey?: string;
  authToken?: string;
  baseURL?: string;
}

export function createClient({ apiKey, authToken, baseURL = '${defaultBaseUrl}' }: ${name.replace(" ", '')}Config) {
  let headers: any = {};
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
          .map((method: any) => `${method.operationId}`)
          .join(",\n    "),
      )
      .join(",\n    ")},
    addHeaders(newHeaders: Record<any, string>) {
      headers = {...headers, ...newHeaders};
      
        axiosClient.setInstance(axios.create({
    baseURL,
    headers,
  }));
      
    }
  };
}
`;
};
