require('../src/db/mongoose')
const express = require("express")
const app = require("./app").app;
const path = require("path");
const chalk = require("chalk");
const checkS3Connection = require("./db/awsS3_controller.js").checkS3Connection;
const corsOriginContoller = require("./middleware/cors_origin_control.js");
require("dotenv").config({ override: true });

//Port config
const port = process.env.PORT || 3000;

console.log(
  chalk.green("[INIT]: Service is in ") +
    chalk.yellow(process.env.MODE) +
    " MODE"
);

process.env.iv = "hi"
console.log(process.env.iv)
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

// TURNED OFF FOR Chat feature dev;
// Instead, using the express.static() in app.js
// TURN IT BACK ON to disable rendering

// app.get("/*", (req, res) => {
//   res.sendFile(path.join(__dirname, "/./messaging/public/index.html"), err => {
//     if (err) {
//       res.status(500).send(err);
//     }
//   });
// });

checkS3Connection();

const server = app.listen(port, () => {
  console.log(
    chalk.green("[INIT]: ") + "Server Listening on Port " + chalk.yellow(port)
  );
});

// Socket Config
const socketConfig = require("./app").socketConfig(server);