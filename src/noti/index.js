const express = require("express");
const jwt = require("jsonwebtoken");

const router = new express.Router();

//const Noti = require("./noti");
const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

//Get Noti for driver
router.get("/notis/get-driverNotis", checkAuth, (req, res) => {
  const username = tokenParser(req.headers.authorization).username;
  db.getNoti(username, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Create Noti for driver
router.post("/notis/create-driverNoti", checkAuth, (req, res) => {
  const username = tokenParser(req.headers.authorization).username;
  req.body.username = username;
  req.body.date = new Date();
  db.createNoti(req.body, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

//Modify Noti for driver as viewed
router.put("/notis/view-driverNoti", checkAuth, (req, res) => {
  const username = tokenParser(req.headers.authorization).username;
  db.updateNoti(username, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

module.exports = router;
