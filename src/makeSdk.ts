import SwaggerParser from "./helpers/SwaggerParser";

const CONFIG = {
  encoding: "utf8",
  templateFiles: {
    axiosClient: "axiosClient.ts",
    models: "models.ts",
    api: "API.ts",
    index: "index.ts",
    readme: "README.md",
  },
};

const generateModels = require("./helpers/generateModels");
const generateCreateClientFile = require("./helpers/generateCreateClientFile");
const writeToFile = require("./helpers/writeToFile");
const generateApiAggregator = require("./helpers/generateApiAggregator");
const generateReadme = require("./helpers/generateReadme");
const generateApiMethods = require("./helpers/generateApiMethods");
const buildSdk = require("./helpers/buildSdk");
const generatePackageJson = require("./helpers/generatePackageJson");

/**
 * Validates input parameters for SDK generation
 * @param {Object} params - Input parameters
 * @param {string} params.swaggerPathOrContent - Swagger URL or content
 * @param {string} params.packageName - Name of the package
 * @throws {Error} If required parameters are missing or invalid
 */
function validateInput({ swaggerPathOrContent, packageName }: any) {
  if (!swaggerPathOrContent) {
    throw new Error("swaggerPathOrContent is required");
  }
  if (!packageName || typeof packageName !== "string") {
    throw new Error("Valid package name is required");
  }
}

/**
 * Generates the axios client configuration file
 * @returns {string} Generated axios client content
 */
function generateAxiosClientContent() {
  return `
import axios, { AxiosInstance } from 'axios';

const axiosClient = (function() {
    let instance: AxiosInstance | null = null;

    return {
        setInstance: (newInstance: AxiosInstance): void => {
            if (!newInstance) {
                throw new Error('Invalid axios instance provided');
            }
            instance = newInstance;
        },
        getInstance: (): AxiosInstance => {
            if (!instance) {
                throw new Error('Axios instance has not been initialized. Call setInstance first.');
            }
            return instance;
        },
        resetInstance: (): void => {
            instance = null;
        }
    };
})();

export default axiosClient;
`;
}

/**
 * Generates controller files for the SDK
 * @param dir
 * @param {Object} controllers - Controller definitions
 * @returns {Promise<void>}
 */
async function generateControllerFiles(dir: any, controllers: any) {
  const controllerPromises = (Object.entries(controllers) as any[])
    .filter(([_, methods]) => methods.length > 0)
    .map(async ([controllerName, methods]) => {
      const apiMethods = generateApiMethods(methods);
      const content = `
import axiosClient from './axiosClient';
import * as models from './models';
${apiMethods}`;

      await writeToFile({ dir, filename: `${controllerName}.ts`, content });
    });

  await Promise.all(controllerPromises);
}

/**
 * Generates the SDK files
 * @param {Object} options - Generation options
 * @param {string} options.swaggerPathOrContent - Swagger URL or content
 * @param {string} options.packageName - Package name
 * @returns {Promise<void>}
 */
async function makeSdk({ swaggerPathOrContent, packageName, outputDir }: any) {
  const srcDir = `${outputDir}/src`;
  const dir = `${outputDir}`;

  try {
    validateInput({ swaggerPathOrContent, packageName });

    // Parse Swagger content
    const { controllers, components, baseUrl, name, description, version } =
      await SwaggerParser.parse(swaggerPathOrContent);

    const coreFileGenerators = [
      writeToFile({
        dir: srcDir,
        filename: CONFIG.templateFiles.models,
        content: generateModels(components),
      }),
      writeToFile({
        dir: srcDir,
        filename: CONFIG.templateFiles.axiosClient,
        content: generateAxiosClientContent(),
      }),
      writeToFile({
        dir: srcDir,
        filename: CONFIG.templateFiles.api,
        content: generateApiAggregator(controllers),
      }),
      writeToFile({
        dir,
        filename: CONFIG.templateFiles.readme,
        content: generateReadme({
          controllers,
          name,
          packageName,
          description,
        }),
      }),
      writeToFile({
        dir: srcDir,
        filename: CONFIG.templateFiles.index,
        content: `export * from './models';\nexport * from './createClient';`,
      }),
      writeToFile({
        dir,
        filename: "package.json",
        content: generatePackageJson({
          packageName,
          version,
          description,
        }),
      }),
      writeToFile({
        dir,
        filename: "tsconfig.json",
        content: `{
  "compilerOptions": {
    "target": "ES6",
    "module": "CommonJS",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
`,
      }),
      writeToFile({
        dir: srcDir,
        filename: "createClient.ts",
        content: generateCreateClientFile({
          controllers,
          name,
          defaultBaseUrl: baseUrl,
        }),
      }),
    ];

    // Generate all files concurrently
    await Promise.all([
      ...coreFileGenerators,
      generateControllerFiles(srcDir, controllers),
    ]);

    buildSdk(dir);
    console.log("SDK generated successfully");
  } catch (error) {
    console.error("Failed to generate SDK:", error);
    throw error;
  }
}

export default makeSdk;
