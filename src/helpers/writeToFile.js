const path = require("path");
const fs = require("fs/promises");

module.exports = async function writeToFile({ dir, filename, content }) {
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), content);
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
};
