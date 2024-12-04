const ApplicationError = require("./ApplicationError");

/**
 * Error class for input validation errors.
 * Extends `ApplicationError` and adds default metadata specific to validation errors.
 */
class ValidationError extends ApplicationError {
  /**
   * Creates an instance of `ValidationError`.
   * @param {string} methodName - Name of the method where the validation error occurred.
   * @param {string} message - Descriptive error message.
   * @param {Object} [details={}] - Additional details about the validation failure.
   */
  constructor(methodName, message, details) {
    super(methodName, message, {
      ...details,
      errorCategory: "Input Validation",
      severity: "Warning",
    });
  }
}

module.exports = ValidationError;
