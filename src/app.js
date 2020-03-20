const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const fileStore = require("session-file-store")(session);

//Express config
const app = express();

app.use(
  cors({
    origin: ["http://localhost:3006"],
    methods: ["GET", "POST"],
    credentials: true
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/../public"));

app.use(
  session({
    name: "session_poolup",
    secret: "change_in_prod_get_from_env_file",
    saveUninitialized: true,
    resave: true
    //store: new fileStore()
  })
);

const userRouter = require("./user/index");
const rideRouter = require("./ride/index");
const notiRouter = require("./noti/index");
const stripeRouter = require("./stripe/index");
const reviewRouter = require("./review/index");
const requestRouter = require("./request/index");

app.use(userRouter);
app.use(rideRouter);
app.use(notiRouter);
app.use(stripeRouter);
app.use(reviewRouter);
app.use(requestRouter);

module.exports = app;
