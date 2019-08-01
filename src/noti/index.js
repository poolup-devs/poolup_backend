const express = require("express");
const router = new express.Router();

//const Noti = require("./noti");
const db = require("./controller.js");

//Get Notif
router.get("/notification", (req, res) => {
  const authToken = JSON.parse(req.query.authToken);
  db.getNoti(authToken.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

//Modify Notif
router.put("/notification", (req, res) => {
  db.updateNoti(req.body.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

module.exports = router;
