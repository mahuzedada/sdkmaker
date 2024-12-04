const SwaggerParser = require("./helpers/SwaggerParser");
const { http, HttpResponse } = require("msw");
const { setupServer } = require("msw/node");
const fs = require("fs");
const { exec } = require("child_process");
const parseSwaggerDoc = require("./helpers/parseSwaggerDoc");
const generateModels = require("./helpers/generateModels");
const getPropertyType = require("./helpers/getPropertyType");
const isPropertyRequired = require("./helpers/isPropertyRequired");
const makeSdk = require("./makeSdk");

// Mock fs and child_process
jest.mock("fs");
jest.mock("child_process");
jest.mock("path");

// Mock Swagger response data
const mockSwaggerDoc = {
  paths: {
    "/users": {
      get: {
        tags: ["UserController"],
        operationId: "getUsers",
        summary: "Get all users",
        parameters: [],
        responses: {
          200: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
        },
      },
      post: {
        tags: ["UserController"],
        operationId: "createUser",
        summary: "Create a user",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateUserDto" },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          role: { enum: ["ADMIN", "USER"] },
        },
        required: ["id", "name"],
      },
      CreateUserDto: {
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["name", "email"],
      },
    },
  },
};

const server = setupServer(
  http.get("https://api.example.com/docs", () =>
    HttpResponse.json(mockSwaggerDoc),
  ),
  http.get("https://api.error.com/docs", () => HttpResponse.error()),
);

describe("SDK Generator", () => {
  // Enable API mocking before tests
  beforeAll(() => server.listen());

  // Reset any runtime request handlers we may add during the tests
  afterEach(() => server.resetHandlers());

  // Clean up after the tests are finished
  afterAll(() => server.close());

  // Clear all other mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("SwaggerParser", () => {
    it("should fetch swagger doc from URL successfully", async () => {
      const result = await SwaggerParser.parseToDocObject(
        "https://api.example.com/docs",
      );
      expect(result).toEqual(mockSwaggerDoc);
    });

    it("should handle API errors", async () => {
      await expect(
        SwaggerParser.parseToDocObject("https://api.error.com/docs"),
      ).rejects.toThrow(
        "[NetworkError] in fetchFromUrl: Failed to fetch Swagger documentation",
      );
    });

    it("should handle malformed responses", async () => {
      // Add a runtime handler for malformed response
      server.use(
        http.get("https://api.malformed.com/docs", () =>
          HttpResponse.json({ invalid: "response" }),
        ),
      );

      await expect(
        SwaggerParser.parseToDocObject("https://api.malformed.com/docs"),
      ).rejects.toThrow(
        "[ValidationError] in parse: Invalid Swagger/OpenAPI document structure",
      );
    });
  });

  describe("parseSwaggerDoc", () => {
    it("should parse swagger doc correctly", () => {
      const { controllers, components } = parseSwaggerDoc(mockSwaggerDoc);

      expect(controllers).toHaveProperty("UserController");
      expect(controllers.UserController).toHaveLength(2);
      expect(controllers.UserController[0]).toMatchObject({
        method: "get",
        path: "/users",
        operationId: "getUsers",
        summary: "Get all users",
      });
      expect(components).toEqual(mockSwaggerDoc.components);
    });

    it("should handle empty paths", () => {
      const emptyDoc = {
        paths: {},
        components: {},
      };

      const { controllers } = parseSwaggerDoc(emptyDoc);
      expect(Object.keys(controllers)).toHaveLength(0);
    });
  });

  describe("generateModels", () => {
    it("should generate TypeScript interfaces with enums", () => {
      const result = generateModels(mockSwaggerDoc.components);

      // Check enum generation
      expect(result).toContain("export type UserRoleEnum = 'ADMIN' | 'USER'");

      // Check interface generation
      expect(result).toContain("export interface User {");
      expect(result).toContain("id: string;");
      expect(result).toContain("name: string;");
      expect(result).toContain("role?: UserRoleEnum;");

      // Check required vs optional properties
      expect(result).toMatch(/id:\s*string;/); // required
      expect(result).toMatch(/role\?:\s*UserRoleEnum;/); // optional
    });
  });

  describe("generateSdk", () => {
    it("should generate all necessary files", async () => {
      await makeSdk({
        swaggerPathOrContent: "https://api.example.com/docs",
        packageName: "name",
      });

      // Check that all necessary files were created
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("models.ts"),
        expect.any(String),
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("axiosClient.ts"),
        expect.any(String),
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("UserController.ts"),
        expect.any(String),
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("createClient.ts"),
        expect.any(String),
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("index.ts"),
        expect.any(String),
      );

      // Verify formatting was called
      expect(exec).toHaveBeenCalledWith("npm run format");
    });
  });

  // Add tests for utility functions
  describe("utility functions", () => {
    describe("getPropertyType", () => {
      it("should return correct type for enum properties", () => {
        const schema = mockSwaggerDoc.components.schemas.User;
        const result = getPropertyType(schema, "User", "role");
        expect(result).toBe("UserRoleEnum");
      });
    });

    describe("isPropertyRequired", () => {
      it("should correctly identify required properties", () => {
        const schema = mockSwaggerDoc.components.schemas.User;
        expect(isPropertyRequired(schema, "id")).toBe(true);
        expect(isPropertyRequired(schema, "role")).toBe(false);
      });
    });
  });
});
