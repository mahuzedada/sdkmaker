// templates.js
function createBaseTemplate(name, packageName, description) {
  return `
# ${name} SDK

This SDK allows you to easily interact with the ${name} API using TypeScript.
${description}

## Features

- **CRUD Operations**: Manage collections, documents, and paragraphs easily.
- **Search**: Perform searches across collections, documents, and paragraphs with relevance filtering.
- **Error Handling**: All API calls return a \`data\`, \`error\`, and \`isBusy\` object to handle responses and errors gracefully.
- **TypeScript Support**: Fully typed for TypeScript users.

## Installation

To use the ${name} SDK, you first need to install it:

\`\`\`bash
npm install ${packageName}
\`\`\`

## Usage

First, initialize the ${name} SDK with your API key:

\`\`\`typescript
import { createClient } from '${packageName}';

const ${name.toLowerCase()} = createClient({ apiKey: 'your-api-key-here' });
\`\`\`
`;
}

function createErrorHandlingSection(name) {
  return `
## Error Handling

Each method in the ${name} SDK returns an object containing:
- \`data\`: The response data from the API if successful.
- \`error\`: An error message if the request fails.
- \`isBusy\`: A boolean indicating whether the request is still in progress.

This allows you to handle API responses and errors effectively without worrying about exceptions being thrown.
`;
}

function createFooter(name) {
  return `
## Contributing

If you would like to contribute to the ${name} SDK, feel free to fork the repository, make your changes, and submit a pull request. We welcome all contributions!

## License

This project is licensed under the MIT License.
`;
}

// utils.js
function validateInput({ controllers, name, packageName }) {
  if (!controllers || typeof controllers !== "object") {
    throw new Error("Controllers must be a valid object");
  }
  if (!name || typeof name !== "string") {
    throw new Error("Name must be a non-empty string");
  }
  if (!packageName || typeof packageName !== "string") {
    throw new Error("Package name must be a non-empty string");
  }
}

function formatMethodExample(method, name) {
  const params = method.parameters
    ? method.parameters
        .map(function (param) {
          return param.name;
        })
        .join(", ")
    : "";
  const requestBody = method.requestBody ? "data" : "";
  const argumentsToPass = [params, requestBody].filter(Boolean).join(", ");

  return `
### ${method.operationId}

**Description:** ${method.summary || "No description provided"}

**Example:**

\`\`\`typescript
const { data, error } = await ${name.toLowerCase()}.${method.operationId}(${
    argumentsToPass ? argumentsToPass : ""
  });

if (error) {
  console.error('Error:', error);
} else {
  console.log('Data:', data);
}
\`\`\`
`;
}

function generateMethodsDocumentation(controllers, name) {
  return Object.entries(controllers)
    .map(function ([controllerName, methods]) {
      return methods
        .map(function (method) {
          return formatMethodExample(method, name);
        })
        .join("\n");
    })
    .join("\n");
}

function generateReadme({ controllers, name, packageName, description }) {
  try {
    // Validate input
    validateInput({ controllers, name, packageName });

    // Generate each section
    const baseTemplate = createBaseTemplate(name, packageName, description);
    const methodsDocumentation = generateMethodsDocumentation(
      controllers,
      name,
    );
    const errorSection = createErrorHandlingSection(name);
    const footer = createFooter(name);

    // Combine all sections
    return [
      baseTemplate,
      "You can now use the SDK to interact with your API. Here's how you can use the functions available in the SDK:",
      methodsDocumentation,
      errorSection,
      footer,
    ].join("\n");
  } catch (error) {
    console.error("Error generating README:", error);
    throw error;
  }
}

module.exports = generateReadme;
