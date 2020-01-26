const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

//Express config
const app = express();

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/../public"));

const userRouter = require("./user/index");
const rideRouter = require("./ride/index");
const notiRouter = require("./noti/index");
const stripeRouter = require("./stripe/index");
const requestRouter = require("./request/index");

app.use(userRouter);
app.use(rideRouter);
app.use(notiRouter);
app.use(stripeRouter);
app.use(requestRouter);

module.exports = app;
