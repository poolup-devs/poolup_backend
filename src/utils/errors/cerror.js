const logger = require("../logger");
/**
 * Cerror class
 * It extends the built in Error class, to:
 *      1. include demanded status code to be passed from controller -> index
 *      2. log the error/ exceptions
 */
class Cerror extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {(Error | string)} err either a system-returned Error object or a custom error message to pass into Error()
   */
  constructor(status, err) {
    if (err instanceof Error) {
      super(err.message);
      this.name = err.name;
      this.stack = err.stack;
      this.logError();
    } else {
      super(err);
      this.name = "CaughtException";
      this.logException();
    }
    this.status = status;
  }
  logError() {
    logger.error(this.stack);
  }
  logException() {
    logger.error(this.name + ": " + this.message);
  }
}

module.exports = Cerror;
