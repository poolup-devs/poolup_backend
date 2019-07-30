const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const User = require("./user/index");

const db = require("./db");

require("dotenv").config({ override: true });

//Port config
const port = process.env.PORT || 3000;

//Express config
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/../public"));

//Routers
const userRouter = User.router;
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

User.checkS3Connection();

app.listen(port, () => {
  console.log("Server Listening on Port ", port);
});
