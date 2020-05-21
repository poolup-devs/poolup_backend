const logger = require("../logger");
const Sentry = require("../sentry.js");

/**
 * errorResponse function
 *
 * Summary.
 * It logs and sends HTTP error responses with appropriate logging/ HTTP levels
 *
 * @param {resObj} res the res returned in router callback functions (in index.js files)
 * @param {Error} err Error class instances
 */
const errorResponse = (res, err) => {
  var status;
  // check if it has status
  if (!err.status) {
    status = 500;
  } else {
    status = err.status;
  }
  // log error
  if (err.name.split(" ")[0] == "ControllerException") {
    logger.exception(err.stack);
  } else {
    logger.error(err.stack);
  }

  // Send to SentryIO
  Sentry.captureException(err);

  // hide details of an internal server error
  if (status == 500) {
    return res.status(status).send("INTERNAL SERVER ERROR");
  }
  return res.status(status).send(err.message);
};

module.exports = errorResponse;
