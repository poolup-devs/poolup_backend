require('../src/db/mongoose')
const app = require("./app") 
const path = require("path");
const chalk = require("chalk");
const checkS3Connection = require("./db/awsS3_controller.js").checkS3Connection;
const corsOriginContoller = require("./middleware/cors_origin_control.js");
const checkIntentBeta = require("./stripe/tool/check-transaction-beta").checkIntentBeta;
require("dotenv").config({ override: true });

//Port config
const port = process.env.PORT || 3000;

console.log(
  chalk.green("[INIT]: Service is in ") +
    chalk.yellow(process.env.MODE) +
    " MODE"
);

// ////////////////////////////////////////
// //TESTER
// ////////////////////////////////////////

app.get("/test-connection", (req, res) => {
  res.send({
    status: "Connection Successful"
  });
});

////////////////////////////////////////
//ERROR STATUS
////////////////////////////////////////
checkIntentBeta();

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "/../public/index.html"), err => {
    if (err) {
      res.status(500).send(err);
    }
  });
});

checkS3Connection();

app.listen(port, () => {
  console.log(
    chalk.green("[INIT]: ") + "Server Listening on Port " + chalk.yellow(port)
  );
});
