const ApplicationError = require("./ApplicationError");

/**
 * Error class for content parsing errors.
 * Extends `ApplicationError` and adds default metadata specific to content parsing errors.
 */
class ContentParsingError extends ApplicationError {
  /**
   * Creates an instance of `ContentParsingError`.
   * @param {string} methodName - Name of the method where the network error occurred.
   * @param {string} message - Descriptive error message.
   * @param {Object} [details={}] - Additional details about the network operation.
   */
  constructor(methodName, message, details) {
    super(methodName, message, {
      ...details,
      errorCategory: "Content Parsing Error",
      severity: "Error",
    });
  }
}

module.exports = ContentParsingError;
