const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const db = require("./db");
require("dotenv").config();

// //AWS config
// const bluebird = require("bluebird");
// const S3_BUCKET = process.env.S3_BUCKET;
// const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
// const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
// const AWS = require("aws-sdk");
// AWS.config.update({
//   accessKeyId: AWS_ACCESS_KEY_ID,
//   secretAccessKey: AWS_SECRET_ACCESS_KEY
// });
// AWS.config.setPromisesDependency(bluebird);
// const s3 = new AWS.S3();

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
    name: "Connection Successful"
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

app.listen(port, () => {
  console.log("Server Listening on Port ", port);
});
