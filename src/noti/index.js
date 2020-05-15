const express = require("express");
const jwt = require("jsonwebtoken");

const router = new express.Router();

//const Noti = require("./noti");
const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

//Get Noti for driver
router.get("/notis/noti", checkAuth, async (req, res) => {
  const username = await tokenParser(req.headers.authorization);
  try {
    const data = await db.getAllUserNoti(username, req.query.pageNum);
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

//Modify Noti for driver as viewed
router.put("/notis/view", checkAuth, async (req, res) => {
  try {
    const data = await db.viewNoti(req.body.notiInfo);
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

module.exports = router;
