const ApplicationError = require("./ApplicationError");

/**
 * Error class for database-related errors.
 * Extends `ApplicationError` and adds default metadata specific to database errors.
 */
class DatabaseError extends ApplicationError {
  /**
   * Creates an instance of `DatabaseError`.
   * @param {string} methodName - Name of the method where the database error occurred.
   * @param {string} message - Descriptive error message.
   * @param {Object} [details={}] - Additional details about the database operation.
   */
  constructor(methodName, message, details) {
    super(methodName, message, {
      ...details,
      errorCategory: "Database Operation",
      severity: "Critical",
    });
  }
}

module.exports = DatabaseError;
