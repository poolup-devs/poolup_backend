const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const chalk = require("chalk");

const checkS3Connection = require("./db/awsS3_controller.js").checkS3Connection;
const corsOriginContoller = require("./middleware/cors_origin_control.js");

require("dotenv").config({ override: true });

console.log(
  chalk.green("[INIT]: Service is in ") +
    chalk.yellow(process.env.MODE) +
    " MODE"
);

//Mongoose config
mongoose.connect("mongodb://localhost/bruinpool", {
  useNewUrlParser: true
});
const db = mongoose.connection;

db.on("error", () => {
  console.log(chalk.red("[ERROR]: Mongoose / Database connection error"));
});

db.once("open", () => {
  console.log(chalk.green("[INIT]: ") + "Mongoose connected successfully");
});

//Port config
const port = process.env.PORT || 3000;

//Express config
const app = express();

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/../public"));

//Routers
const userRouter = require("./user/index");
const rideRouter = require("./ride/index");
const notiRouter = require("./noti/index");

app.use(userRouter);
app.use(rideRouter);
app.use(notiRouter);

////////////////////////////////////////
//TESTER
////////////////////////////////////////

app.get("/test-connection", (req, res) => {
  res.send({
    status: "Connection Successful"
  });
});

////////////////////////////////////////
//ERROR STATUS
////////////////////////////////////////

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
