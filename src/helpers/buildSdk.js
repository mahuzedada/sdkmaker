const { execSync } = require("child_process");

function buildSdk(dir) {
  try {
    // Change to specified directory
    process.chdir(dir);
    console.log("Successfully changed directory");

    // Run npm install
    console.log("Running npm install...");
    execSync("npm install", { stdio: "inherit" });
    console.log("npm install completed");

    // Run npm run build
    console.log("Running npm run build...");
    execSync("npm run build", { stdio: "inherit" });
    console.log("Build completed successfully");

    return true;
  } catch (error) {
    console.error("Error occurred:", error.message);
    return false;
  }
}

module.exports = buildSdk;
