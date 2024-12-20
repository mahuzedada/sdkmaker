/**
 * @fileoverview Generates JavaScript models from OpenAPI schema components.
 * This module transforms OpenAPI schema definitions into JavaScript interface declarations.
 */

const generateEnums = require("./generateEnums");
const isPropertyRequired = require("./isPropertyRequired");
const getPropertyType = require("./getPropertyType");

/**
 * Formats a property declaration with proper indentation and type information
 * @param {Object} schema - The complete schema object containing property definitions
 * @param {string} schemaName - Name of the current schema being processed
 * @param {string} propertyName - Name of the property to format
 * @returns {string} Formatted property declaration
 */
function formatPropertyDeclaration(schema, schemaName, propertyName) {
  const required = isPropertyRequired(schema, propertyName);
  const propertyType = getPropertyType(schema, schemaName, propertyName);
  const optionalMarker = required ? "" : "?";

  return `    ${propertyName}${optionalMarker}: ${propertyType};`;
}

/**
 * Generates a single model interface from a schema definition
 * @param {string} schemaName - Name of the schema to generate
 * @param {Object} schema - Schema definition object
 * @returns {string} Generated interface declaration
 */
function generateSingleModel(schemaName, schema) {
  const properties = schema.properties ? Object.keys(schema.properties)
    .map((property) => formatPropertyDeclaration(schema, schemaName, property))
    .join("\n") : '';

  return `
export interface ${schemaName} {
${properties}
}`;
}

/**
 * Generates model interfaces from OpenAPI components
 * @param {Object} components - OpenAPI components object containing schemas
 * @param {Object} components.schemas - Schema definitions
 * @returns {string} Generated TypeScript interfaces and enums
 */
function generateModels(components) {
  // Input validation
  if (!components?.schemas) {
    throw new Error("Invalid components object: missing schemas");
  }

  const { schemas } = components;

  // Generate enums first as they might be referenced by models
  const enums = generateEnums(schemas);

  // Generate each model interface
  const models = Object.entries(schemas)
    .map(([schemaName, schema]) => generateSingleModel(schemaName, schema))
    .join("\n\n");

  // Combine enums and models with proper spacing
  return `
export interface ApiError {
  code?: string;
  message?: string;
}

export interface ApiResponseMeta {
  path?: string;
  timestamp?: string;
}

export interface ApiResponse<T = any> {
  statusCode?: number;
  data?: T;
  error?: ApiError;
  meta?: ApiResponseMeta;
}


  ${enums}\n\n${models}`;
}

module.exports = generateModels;
