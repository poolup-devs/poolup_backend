const winston = require("winston");

const options = {
  file: {
    level: "info",
    filename: "./logs/log_1.log",
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
  },
  console: {
    level: "debug",
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

const logger = winston.createLogger({
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.Console(options.console),
  ],
  exitOnError: false,
});

module.exports = logger;
module.exports.stream = {
  write: function (message, encoding) {
    logger.info(message);
  },
};
