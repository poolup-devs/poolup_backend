const express = require("express");
const router = new express.Router();

//const Ride = require("./ride");
const db = require("../db");

//Get List of Rides
router.get("/rideList", (req, res) => {
  db.getRide(req.query, req.query.type, req.query.pageNum, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Post a Ride
router.post("/rideList", (req, res) => {
  db.postRide(req.body.rideInfo, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

//Modify Data of a Ride
router.put("/rideList", (req, res) => {
  db.rideUpdate(
    req.body.entry,
    req.body.userInfo,
    req.body.status,
    (err, data) => {
      if (err) {
        res.sendStatus(500);
      } else {
        res.status(200).send(data);
      }
    }
  );
});

//Delete a ride
router.delete("/rideList", (req, res) => {
  const ride = JSON.parse(req.query.ride);
  db.rideDelete(ride._id, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

module.exports = router;
