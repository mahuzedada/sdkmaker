/**
 * Base class for application-specific errors.
 * Extends the native `Error` class to provide additional metadata such as method name, error details, and timestamp.
 */
class ApplicationError extends Error {
  /**
   * Creates an instance of `ApplicationError`.
   * @param {string} methodName - Name of the method where the error occurred.
   * @param {string} message - Descriptive error message.
   * @param {Object} [details={}] - Additional details about the error (e.g., inputs, metadata).
   */
  constructor(methodName, message, details = {}) {
    // Capture the name of the derived error class (e.g., ValidationError)
    const errorType = new.target.name;
    const formattedMessage = `[${errorType}] in ${methodName}: ${message}`;

    // Call the parent constructor with the formatted message
    super(formattedMessage);

    /**
     * @property {string} name - Name of the error class (e.g., ValidationError).
     */
    this.name = errorType;

    /**
     * @property {string} methodName - Method where the error occurred.
     */
    this.methodName = methodName;

    /**
     * @property {Object} details - Additional details about the error context.
     */
    this.details = details;

    /**
     * @property {string} timestamp - ISO 8601 timestamp of when the error occurred.
     */
    this.timestamp = new Date().toISOString();

    /**
     * @property {string} errorType - Type of the error, derived from the class name.
     */
    this.errorType = errorType;

    // Capture the error stack trace for debugging purposes
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts the error instance to a JSON-friendly object.
   * @returns {Object} JSON representation of the error, including type, name, method, message, details, and stack trace.
   */
  toJSON() {
    return {
      type: this.errorType,
      name: this.name,
      methodName: this.methodName,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }

  /**
   * Converts the error instance to a human-readable string format.
   * @returns {string} A formatted string representation of the error.
   */
  toString() {
    return `${this.message}
Error Type: ${this.errorType}
Method: ${this.methodName}
Time: ${this.timestamp}
Details: ${JSON.stringify(this.details, null, 2)}`;
  }
}

module.exports = ApplicationError;
