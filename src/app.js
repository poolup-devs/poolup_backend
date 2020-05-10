const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);

//Express config
const app = express();

app.use(
  cors({
    origin: [process.env.FRONT_END_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/../public"));

app.use(
  session({
    name: "session_poolup",
    secret: process.env.SESSION_SECRET_KEY,
    saveUninitialized: true,
    resave: true,
    cookie: {
      maxAge: 3600000, // 1 hour in miliseconds
    },
    store: new MongoStore({
      mongooseConnection: mongoose.connection,
      ttl: 3600, // 1 hour in seconds
    }),
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
