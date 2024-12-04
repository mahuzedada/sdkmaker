# SDKMaker

`sdkmaker` is a command-line tool for generating TypeScript SDKs from Swagger (OpenAPI) JSON definitions. It simplifies the process of creating client-side APIs, making it easier to integrate with backend services.

## Features

- Generate a TypeScript SDK from a Swagger JSON file or URL.
- Specify the package name for the generated SDK.
- Supports configuration through a `sdk.json` file.
- Flexible CLI for seamless integration into deployment pipelines.

---

## Installation

Install globally via npm:

```bash
npm install -g sdkmaker
```

---

## Usage

### CLI Command

#### Generate SDK
Use the `generate` command to create an SDK:

```bash
sdkmaker generate -s <path_to_swagger_json> -o <output_directory>
```

#### Options
- `-s, --swagger`: Path to the Swagger JSON file or URL (Required if not in config).
- `-o, --output`: Directory where the SDK files will be generated (Required if not in config).
- `-p, --package-name`: Name of the generated SDK package (Optional).
- `-c, --config`: Path to a configuration file (default: `./sdk.json`) (Optional).

---

### Examples

#### 1. Generate an SDK with CLI options
```bash
sdkmaker generate -s https://api.handycrew.net/docs-json - o /Users/chatis/projects/sdkmaker/sdk-maker-test/__sdk_ouitput -p @handy-crew-sdk/ts
```

- Swagger JSON: `./swagger.json`
- Output Directory: `./sdk-output`
- Package Name: `my-sdk`

#### 2. Use a configuration file
Create a `sdk.json` in the working directory:

```json
{
  "swaggerPathOrContent": "./swagger.json",
  "outputDir": "./sdk-output",
  "packageName": "my-sdk-package"
}
```

Run the CLI:
```bash
sdkmaker generate
```

#### 3. Override configuration with CLI options
```bash
sdkmaker generate -s ./new-swagger.json -o ./new-sdk-output
```

---

## Configuration File

The `sdk.json` file can be used to specify default options. The CLI will automatically look for this file in the current directory unless overridden by the `-c` option.

### Example `sdk.json`
```json
{
  "swaggerPathOrContent": "./swagger.json",
  "outputDir": "./sdk-output",
  "packageName": "my-sdk-package"
}
```

---

## Integration in Deployment Pipelines

You can integrate `sdkmaker` into your deployment scripts to automatically generate SDKs post-deployment.

### Example with PM2:
Add the following to your `ecosystem.config.js`:

```json
{"post-deploy": "sdkmaker generate -s ./swagger.json -o ./sdk-output"}
```

---

## Troubleshooting

### Common Issues

1. **Swagger JSON Not Found**:
    - Ensure the file path or URL provided in `-s` is correct.
    - If using a configuration file, verify the `swaggerPathOrContent` field is accurate.

2. **Output Directory Not Specified**:
    - Use the `-o` option or define `outputDir` in the configuration file.

3. **Configuration File Errors**:
    - Ensure `sdk.json` is valid JSON and includes `swaggerPathOrContent` and `outputDir`.

---

## License

This project is licensed under the MIT License.

---

## Contribution

Contributions are welcome! If you find a bug or have a feature request, feel free to create an issue or submit a pull request.

---

Start generating your TypeScript SDKs with ease using `sdkmaker`! 🎉

--- 
