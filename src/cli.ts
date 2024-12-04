#!/usr/bin/env node
import {Command} from "commander";
import inquirer from "inquirer";
import path from "path";
import SwaggerParser from "./helpers/SwaggerParser";
import makeSdk from "./makeSdk";

interface SdkOptions {
    swaggerPathOrContent: string;
    outputDir: string;
    packageName: string;
}

const program = new Command();

async function getDefaultPackageName(swaggerPath: string): Promise<string> {
    try {
        const parsedApi = await SwaggerParser.parse(swaggerPath);
        // The parser should return parsed OpenAPI doc with info.title
        return parsedApi.name
                .toLowerCase()
                .replace('api', '')
                .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
                .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
            + '-sdk';
    } catch (error) {
        console.warn('Warning: Could not parse Swagger file for default package name');
        return '';
    }
}

async function promptForOptions(): Promise<SdkOptions> {
    // First ask for the Swagger path
    const swaggerAnswer = await inquirer.prompt([
        {
            type: 'input',
            name: 'swaggerPathOrContent',
            message: 'Enter the path to Swagger JSON file or URL:',
            validate: (input: string) => {
                if (!input.trim()) {
                    return 'Swagger path or URL is required';
                }
                return true;
            }
        }
    ]);

    // Get the default package name from the Swagger file
    const defaultPackageName = await getDefaultPackageName(swaggerAnswer.swaggerPathOrContent);

    // Then ask remaining questions with the default package name
    const remainingAnswers = await inquirer.prompt([
        {
            type: 'input',
            name: 'outputDir',
            default: defaultPackageName,
            message: 'Enter relative path of the output directory for SDK files:',
            validate: (input: string) => {
                if (!input.trim()) {
                    return 'Output directory is required';
                }
                return true;
            },
            filter: (input: string) => {
                return path.resolve(process.cwd(), input);
            }
        },
        {
            type: 'input',
            name: 'packageName',
            message: 'Enter the package name for the generated SDK:',
            default: defaultPackageName,
            validate: (input: string) => {
                if (!input.trim()) {
                    return 'Package name is required';
                }
                // Add npm package name validation if needed
                return true;
            }
        }
    ]);

    return {
        swaggerPathOrContent: swaggerAnswer.swaggerPathOrContent,
        outputDir: remainingAnswers.outputDir,
        packageName: remainingAnswers.packageName
    };
}

program
    .name("sdkmaker")
    .description("Generate TypeScript SDK from Swagger JSON")
    .version("1.0.0");

program
    .command("generate")
    .description("Generate SDK files")
    .option("-y, --yes", "Skip prompts and use command line options")
    .option("-s, --swagger <path>", "Path to Swagger JSON file or URL")
    .option("-o, --output <path>", "Output directory for SDK files")
    .option("-p, --package-name <name>", "Package name for the generated SDK")
    .action(async (options) => {
        let sdkOptions: SdkOptions;

        if (options.yes) {
            if (!options.swagger || !options.output) {
                console.error(
                    "Error: When using --yes flag, both --swagger and --output options are required."
                );
                process.exit(1);
            }

            // If no package name is provided, try to get it from the Swagger file
            let packageName = options.packageName;
            if (!packageName) {
                packageName = await getDefaultPackageName(options.swagger);
            }

            sdkOptions = {
                swaggerPathOrContent: options.swagger,
                outputDir: path.resolve(options.output),
                packageName: packageName
            };
        } else {
            try {
                sdkOptions = await promptForOptions();
            } catch (error) {
                console.error("Error during prompt:", error);
                process.exit(1);
            }
        }

        try {
            console.log("\nGenerating SDK with options:", sdkOptions);
            await makeSdk(sdkOptions);
            console.log("SDK generated successfully!");
        } catch (error: any) {
            console.error("Error generating SDK:", error.message);
            process.exit(1);
        }
    });

program.parse(process.argv);
