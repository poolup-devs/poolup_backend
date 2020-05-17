const mongoose = require("mongoose");
const logger = require("../utils/logger");

//Mongoose config
mongoose.connect(process.env.MONGODB_URL, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", () => {
  logger.error("[ERROR]: Mongoose / Database connection error");
});
db.once("open", () => {
  logger.info("[INIT]: " + "Mongoose connected successfully");
});
