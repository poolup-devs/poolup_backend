const logger = require("../logger");
/**
 * Cerror class (Controller raised Error class)
 *
 * Summary.
 * It extends the built in Error class, to:
 *      1. include demanded status code to be passed from controller -> index
 *      2. inherit stack trace
 */
class ControllerException extends Error {
  /**
   * @param {string} message error message to pass into Error()
   * @param {number} status HTTP status code - default to 500
   */
  constructor(status, message) {
    if (!message || !status) {
      throw Error("missing message field for ControllerException class");
    }
    super(message);
    this.name = `ControllerException (${this.constructor.getExceptionTag(status)})`;
    this.status = status;
  }

  static getExceptionTag(status) {
    const statusDictionary = {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
    };
    const res = statusDictionary[status];
    return res ? res : "undefined status";
  }
}

module.exports = ControllerException;
