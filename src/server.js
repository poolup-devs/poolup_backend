const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const chalk = require("chalk");

const checkS3Connection = require("./db/awsS3_controller.js").checkS3Connection;

require("dotenv").config({ override: true });

//Mongoose config
mongoose.connect("mongodb://localhost/bruinpool", {
  useNewUrlParser: true
});
const db = mongoose.connection;

db.on("error", () => {
  console.log(chalk.red("[ERROR]: Mongoose connection error"));
});

db.once("open", () => {
  console.log(chalk.green("[INIT]: ") + "Mongoose connected successfully");
});

//Port config
const port = process.env.PORT || 3000;

//Express config
const app = express();

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

if (process.env.MODE === "STAGING") {
  checkS3Connection();
}

app.listen(port, () => {
  console.log(
    chalk.green("[INIT]: ") + "Server Listening on Port " + chalk.yellow(port)
  );
});
