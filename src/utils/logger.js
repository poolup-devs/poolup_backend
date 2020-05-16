const winston = require("winston");

const customLevel = {
  levels: {
    error: 0,
    warn: 1,
    exception: 2,
    info: 3,
    http: 4,
    verbose: 5,
    debug: 6,
    silly: 7,
  },
  colors: {
    error: "redBG",
    exception: "magenta",
    warn: "yellow",
    info: "green",
    http: "blue",
    verbose: "grey",
    debug: "cyan",
    silly: "gray",
  },
};

winston.addColors(customLevel.colors);
const options = {
  file: {
    level: "info",
    filename: `./logs/${process.env.MODE}/${process.env.MODE}-log.log`,
    handleExceptions: true,
    json: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: false,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json({ replacer: null, value: 3 })
    ),
  },
  console: {
    level: "debug",
    handleExceptions: true,
    json: false,
    colorize: true,
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      winston.format.printf(
        (info) => `[${info.level} ${info.timestamp}] \n ${info.message}`
      )
    ),
  },
};

const logger = winston.createLogger({
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.Console(options.console),
  ],
  levels: customLevel.levels,
  exitOnError: false,
});

module.exports = logger;
module.exports.stream = {
  write: function (message, encoding) {
    logger.info(message);
  },
};
