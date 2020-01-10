const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const bodyParser = require("body-parser");
const cors = require("cors");

//Express config
const app = express();

//Socketio config
// var io;
// const socketConfig = (server) => {
//     io = socketio(server);
// }

app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// REVERT back to this static path
// app.use(express.static(__dirname + "/../public"));
// This is for testing messaging feature
app.use(express.static(__dirname + "/messaging/public" ))

// REST endpoint routers
const userRouter = require("./user/index");
const rideRouter = require("./ride/index");
const notiRouter = require("./noti/index");
const messageRouter = require("./messaging/index");

// // Socket Jobs
// const messageSocket = require("./messaging/socketJobs")(io);

app.use(userRouter);
app.use(rideRouter);
app.use(notiRouter);
app.use(messageRouter);

module.exports = {
    socketConfig: function(server) {
        const io = socketio(server);
        // Socket Jobs
        const messageSocket = require("./messaging/socketJobs")(io);
    },
    app
}