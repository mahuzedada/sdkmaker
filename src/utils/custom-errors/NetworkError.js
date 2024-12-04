const ApplicationError = require("./ApplicationError");

/**
 * Error class for network-related errors.
 * Extends `ApplicationError` and adds default metadata specific to network errors.
 */
class NetworkError extends ApplicationError {
  /**
   * Creates an instance of `NetworkError`.
   * @param {string} methodName - Name of the method where the network error occurred.
   * @param {string} message - Descriptive error message.
   * @param {Object} [details={}] - Additional details about the network operation.
   */
  constructor(methodName, message, details) {
    super(methodName, message, {
      ...details,
      errorCategory: "Network Operation",
      severity: "Error",
    });
  }
}

module.exports = NetworkError;
