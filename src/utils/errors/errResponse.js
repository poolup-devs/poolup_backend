const logger = require("../logger");

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

  // hide details of an internal server error
  if (status == 500) {
    return res.status(status).send("INTERNAL SERVER ERROR");
  }
  return res.status(status).send(err.message);
};

module.exports = errorResponse;
