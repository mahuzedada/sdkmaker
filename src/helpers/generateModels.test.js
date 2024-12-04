/**
 * @jest-environment node
 */

const generateModels = require("./generateModels");

// Mock dependencies
jest.mock("./generateEnums", () => jest.fn(() => "mock enum content"));
jest.mock("./isPropertyRequired", () =>
  jest.fn((schema, prop) => schema.required?.includes(prop) ?? false),
);
jest.mock("./getPropertyType", () =>
  jest.fn((schema, schemaName, prop) => {
    const typeMap = {
      string: "string",
      number: "number",
      boolean: "boolean",
    };
    return typeMap[schema.properties[prop].type] || "any";
  }),
);

describe("generateModels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should generate a basic model with required properties", () => {
    const components = {
      schemas: {
        User: {
          properties: {
            id: { type: "number" },
            name: { type: "string" },
            isActive: { type: "boolean" },
          },
          required: ["id", "name"],
        },
      },
    };

    const expected = `mock enum content


export interface User {
    id: number;
    name: string;
    isActive?: boolean;
}`;

    expect(generateModels(components).trim()).toBe(expected.trim());
  });

  test("should handle multiple models", () => {
    const components = {
      schemas: {
        User: {
          properties: {
            id: { type: "number" },
            name: { type: "string" },
          },
          required: ["id"],
        },
        Post: {
          properties: {
            title: { type: "string" },
            content: { type: "string" },
          },
          required: ["title"],
        },
      },
    };

    const expected = `mock enum content


export interface User {
    id: number;
    name?: string;
}


export interface Post {
    title: string;
    content?: string;
}`;

    expect(generateModels(components).trim()).toBe(expected.trim());
  });

  test("should handle empty properties object", () => {
    const components = {
      schemas: {
        EmptyModel: {
          properties: {},
        },
      },
    };

    const expected = `mock enum content


export interface EmptyModel {

}`;

    expect(generateModels(components).trim()).toBe(expected.trim());
  });

  test("should throw error for invalid input", () => {
    const invalidInputs = [
      null,
      undefined,
      {},
      { schemas: null },
      { otherStuff: {} },
    ];

    invalidInputs.forEach((input) => {
      expect(() => generateModels(input)).toThrow(
        "Invalid components object: missing schemas",
      );
    });
  });

  test("should handle complex nested structures", () => {
    const components = {
      schemas: {
        ComplexModel: {
          properties: {
            simpleField: { type: "string" },
            arrayField: {
              type: "array",
              items: { type: "string" },
            },
            objectField: {
              type: "object",
              properties: {
                nestedField: { type: "number" },
              },
            },
          },
          required: ["simpleField"],
        },
      },
    };

    const result = generateModels(components);
    expect(result).toContain("export interface ComplexModel");
    expect(result).toContain("simpleField: string;");
  });

  test("should maintain consistent spacing and formatting", () => {
    const components = {
      schemas: {
        TestModel: {
          properties: {
            field: { type: "string" },
          },
        },
      },
    };

    const result = generateModels(components);

    // Check for proper newlines between sections
    expect(result.split("\n\n").length).toBeGreaterThan(1);

    // Check for proper indentation
    expect(result).toMatch(/    field\?:/);
  });

  describe("integration with dependencies", () => {
    const generateEnums = require("./generateEnums");
    const isPropertyRequired = require("./isPropertyRequired");
    const getPropertyType = require("./getPropertyType");

    test("should call dependency functions with correct arguments", () => {
      const components = {
        schemas: {
          TestModel: {
            properties: {
              testField: { type: "string" },
            },
            required: ["testField"],
          },
        },
      };

      generateModels(components);

      // Verify generateEnums was called
      expect(generateEnums).toHaveBeenCalledWith(components.schemas);

      // Verify isPropertyRequired was called
      expect(isPropertyRequired).toHaveBeenCalledWith(
        components.schemas.TestModel,
        "testField",
      );

      // Verify getPropertyType was called
      expect(getPropertyType).toHaveBeenCalledWith(
        components.schemas.TestModel,
        "TestModel",
        "testField",
      );
    });
  });

  // Performance test for large schemas
  test("should handle large schemas efficiently", () => {
    const largeComponents = {
      schemas: {},
    };

    // Generate a large schema with 1000 properties
    const largeSchema = {
      properties: {},
      required: [],
    };

    for (let i = 0; i < 1000; i++) {
      largeSchema.properties[`field${i}`] = { type: "string" };
      if (i % 2 === 0) {
        largeSchema.required.push(`field${i}`);
      }
    }

    largeComponents.schemas.LargeModel = largeSchema;

    const startTime = process.hrtime();
    const result = generateModels(largeComponents);
    const [seconds, nanoseconds] = process.hrtime(startTime);

    // Ensure it completes in under 1 second
    expect(seconds).toBe(0);
    expect(nanoseconds).toBeLessThan(1e9);

    // Verify the output contains the expected number of fields
    expect(result.match(/field\d+/g)).toHaveLength(1000);
  });
});
