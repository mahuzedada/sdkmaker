const generateReadme = require("./generateReadme");

describe("generateReadme", () => {
  let mockControllers;
  let mockName;
  let mockPackageName;

  beforeEach(() => {
    mockControllers = {
      documents: [
        {
          operationId: "createDocument",
          summary: "Creates a new document",
          parameters: [{ name: "collectionId" }, { name: "title" }],
          requestBody: true,
        },
        {
          operationId: "getDocument",
          summary: "Retrieves a document by ID",
          parameters: [{ name: "documentId" }],
        },
      ],
      collections: [
        {
          operationId: "listCollections",
          summary: "Lists all collections",
          parameters: [],
        },
      ],
    };
    mockName = "TestAPI";
    mockPackageName = "@test/sdk";
  });

  test("generates complete README with all sections", () => {
    const result = generateReadme({
      controllers: mockControllers,
      name: mockName,
      packageName: mockPackageName,
    });

    // Check if all major sections are present
    expect(result).toContain("# TestAPI SDK");
    expect(result).toContain("## Features");
    expect(result).toContain("## Installation");
    expect(result).toContain("## Usage");
    expect(result).toContain("## Error Handling");
    expect(result).toContain("## Contributing");
    expect(result).toContain("## License");
  });

  test("includes correct installation instructions", () => {
    const result = generateReadme({
      controllers: mockControllers,
      name: mockName,
      packageName: mockPackageName,
    });

    expect(result).toContain("npm install @test/sdk");
    expect(result).toContain("import { createClient } from '@test/sdk'");
    expect(result).toContain(
      "const testapi = createClient({ apiKey: 'your-api-key-here' })",
    );
  });

  test("generates correct function examples for each controller", () => {
    const result = generateReadme({
      controllers: mockControllers,
      name: mockName,
      packageName: mockPackageName,
    });

    // Test createDocument example (with parameters and request body)
    expect(result).toContain("### createDocument");
    expect(result).toContain(
      "const { data, error } = await testapi.createDocument(collectionId, title, data)",
    );

    // Test getDocument example (with parameters only)
    expect(result).toContain("### getDocument");
    expect(result).toContain(
      "const { data, error } = await testapi.getDocument(documentId)",
    );

    // Test listCollections example (no parameters)
    expect(result).toContain("### listCollections");
    expect(result).toContain(
      "const { data, error } = await testapi.listCollections()",
    );
  });

  test("handles methods without parameters correctly", () => {
    mockControllers = {
      test: [
        {
          operationId: "noParamsMethod",
          summary: "Method without parameters",
        },
      ],
    };

    const result = generateReadme({
      controllers: mockControllers,
      name: mockName,
      packageName: mockPackageName,
    });

    expect(result).toContain(
      "const { data, error } = await testapi.noParamsMethod()",
    );
  });

  test("handles methods without summaries correctly", () => {
    mockControllers = {
      test: [
        {
          operationId: "noSummaryMethod",
          parameters: [{ name: "id" }],
        },
      ],
    };

    const result = generateReadme({
      controllers: mockControllers,
      name: mockName,
      packageName: mockPackageName,
    });

    expect(result).toContain("No description provided");
  });

  test("handles empty controllers object", () => {
    const result = generateReadme({
      controllers: {},
      name: mockName,
      packageName: mockPackageName,
    });

    expect(result).toContain("# TestAPI SDK");
    expect(result).toContain("## Features");
    expect(result).not.toContain("undefined");
  });

  test("preserves markdown formatting", () => {
    const result = generateReadme({
      controllers: mockControllers,
      name: mockName,
      packageName: mockPackageName,
    });

    // Check code blocks are properly formatted
    expect(result).toMatch(/```typescript[\s\S]*```/);
    expect(result).toMatch(/```bash[\s\S]*```/);

    // Check headers are properly formatted
    expect(result).toMatch(/^#\s.*SDK/m);
    expect(result).toMatch(/^##\s.*/m);
    expect(result).toMatch(/^###\s.*/m);
  });

  test("generates correct error handling section", () => {
    const result = generateReadme({
      controllers: mockControllers,
      name: mockName,
      packageName: mockPackageName,
    });

    expect(result).toContain("## Error Handling");
    expect(result).toContain("`data`");
    expect(result).toContain("`error`");
    expect(result).toContain("`isBusy`");
  });
});
