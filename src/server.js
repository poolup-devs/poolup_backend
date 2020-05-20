require("../src/db/mongoose");
const app = require("./app");
const path = require("path");
const logger = require("./utils/logger");
const checkS3Connection = require("./db/awsS3_controller.js").checkS3Connection;
const corsOriginContoller = require("./middleware/cors_origin_control.js");
const checkTransfer = require("./stripe/tool/check-transfer.js").checkTransfer;
require("dotenv").config({ override: true });

//Port config
const port = process.env.PORT || 3000;

logger.info("[INIT]: Service is in " + process.env.MODE + " MODE");
logger.info("[INIT]: FRONT_END_URL: " + process.env.FRONT_END_URL);

logger.info("[INIT]: MONGODB_URL: " + process.env.MONGODB_URL);

// ////////////////////////////////////////
// //TESTER
// ////////////////////////////////////////

app.get("/test-connection", (req, res) => {
  res.send({
    status: "Connection Successful",
  });
});

////////////////////////////////////////
//ERROR STATUS
////////////////////////////////////////
checkTransfer();

app.get("/*", (req, res) => {
  res
    .status(400)
    .sendFile(path.join(__dirname, "/../public/index.html"), (err) => {
      if (err) {
        res.status(500).send(err);
      }
    });
});

checkS3Connection();

app.listen(port, () => {
  logger.info("[INIT]: " + "Server Listening on Port " + port);
});
