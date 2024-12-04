const parseSwaggerDoc = require("./parseSwaggerDoc");

describe("Swagger Document Parser", () => {
  describe("Basic Functionality", () => {
    test("should parse an empty swagger document", () => {
      const emptyDoc = {
        paths: {},
        components: {},
      };

      const result = parseSwaggerDoc(emptyDoc);

      expect(result).toEqual({
        controllers: {},
        components: {},
      });
    });

    test("should parse a simple path with one operation", () => {
      const simpleDoc = {
        paths: {
          "/users": {
            get: {
              tags: ["UserController"],
              operationId: "getUsers",
              summary: "Get all users",
              parameters: [],
              responses: {
                200: {
                  description: "Success",
                },
              },
            },
          },
        },
        components: {},
      };

      const result = parseSwaggerDoc(simpleDoc);

      expect(result.controllers).toHaveProperty("UserController");
      expect(result.controllers.UserController).toHaveLength(1);
      expect(result.controllers.UserController[0]).toEqual({
        method: "get",
        path: "/users",
        operationId: "getUsers",
        summary: "Get all users",
        parameters: [],
        responses: {
          200: {
            description: "Success",
          },
        },
      });
    });
  });

  describe("Controller Organization", () => {
    test("should group multiple operations under the same controller", () => {
      const multiOperationDoc = {
        paths: {
          "/users": {
            get: {
              tags: ["UserController"],
              operationId: "getUsers",
              summary: "Get users",
            },
            post: {
              tags: ["UserController"],
              operationId: "createUser",
              summary: "Create user",
            },
          },
        },
        components: {},
      };

      const result = parseSwaggerDoc(multiOperationDoc);

      expect(result.controllers.UserController).toHaveLength(2);
      expect(
        result.controllers.UserController.map((op) => op.operationId),
      ).toEqual(["getUsers", "createUser"]);
    });

    test("should use DefaultController when no tags are provided", () => {
      const noTagDoc = {
        paths: {
          "/status": {
            get: {
              operationId: "getStatus",
              summary: "Get API status",
            },
          },
        },
        components: {},
      };

      const result = parseSwaggerDoc(noTagDoc);

      expect(result.controllers).toHaveProperty("DefaultController");
      expect(result.controllers.DefaultController[0].operationId).toBe(
        "getStatus",
      );
    });
  });

  describe("Operation ID Filtering", () => {
    test("should skip operations with Controller_ in operationId", () => {
      const mixedDoc = {
        paths: {
          "/users": {
            get: {
              tags: ["UserController"],
              operationId: "Controller_getUsers",
              summary: "Should be skipped",
            },
            post: {
              tags: ["UserController"],
              operationId: "createUser",
              summary: "Should be included",
            },
          },
        },
        components: {},
      };

      const result = parseSwaggerDoc(mixedDoc);

      expect(result.controllers.UserController).toHaveLength(1);
      expect(result.controllers.UserController[0].operationId).toBe(
        "createUser",
      );
    });
  });

  describe("Complex Scenarios", () => {
    test("should handle multiple paths, methods, and controllers", () => {
      const complexDoc = {
        paths: {
          "/users": {
            get: {
              tags: ["UserController"],
              operationId: "getUsers",
              parameters: [{ name: "limit", in: "query" }],
            },
            post: {
              tags: ["UserController"],
              operationId: "createUser",
              requestBody: {
                content: {
                  "application/json": {
                    schema: { type: "object" },
                  },
                },
              },
            },
          },
          "/posts": {
            get: {
              tags: ["PostController"],
              operationId: "getPosts",
            },
          },
          "/status": {
            get: {
              operationId: "getStatus",
            },
          },
        },
        components: {
          schemas: {
            User: {
              type: "object",
            },
          },
        },
      };

      const result = parseSwaggerDoc(complexDoc);

      expect(Object.keys(result.controllers)).toHaveLength(3);
      expect(result.controllers.UserController).toHaveLength(2);
      expect(result.controllers.PostController).toHaveLength(1);
      expect(result.controllers.DefaultController).toHaveLength(1);
      expect(result.components).toEqual({
        schemas: {
          User: {
            type: "object",
          },
        },
      });
    });
  });

  describe("Edge Cases", () => {
    test("should handle missing optional properties", () => {
      const sparseDoc = {
        paths: {
          "/minimal": {
            get: {
              tags: ["MinimalController"],
              operationId: "minimal",
            },
          },
        },
        components: {},
      };

      const result = parseSwaggerDoc(sparseDoc);
      const operation = result.controllers.MinimalController[0];

      expect(operation.parameters).toBeUndefined();
      expect(operation.requestBody).toBeUndefined();
      expect(operation.responses).toBeUndefined();
    });

    test("should handle empty path objects", () => {
      const emptyPathDoc = {
        paths: {
          "/empty": {},
        },
        components: {},
      };

      const result = parseSwaggerDoc(emptyPathDoc);
      expect(result.controllers).toEqual({});
    });
  });
});
