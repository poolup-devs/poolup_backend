const express = require("express");
const router = new express.Router();

//const Ride = require("./ride");
const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

///////////////////////////////////////////////////////////////
///////////GET RIDES///////////////////////////////////////////
///////////////////////////////////////////////////////////////

//Get List of Available/ future Rides
router.get("/rides/matching-rides", checkAuth, (req, res) => {
  db.getMatchingRides(req.query.filter, req.query.pageNum, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Get another user's ride history
router.get("/rides/user-rides-history", checkAuth, (req, res) => {
  db.getRideHistory(req.query.username, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Get my ride history
router.get("/rides/my-rides-history", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  db.getMyRideHistory(authUsername, req.query.pageNum, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Get my ride upcoming
router.get("/rides/my-rides-upcoming", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  db.getMyRideUpcoming(authUsername, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

///////////////////////////////////////////////////////////////
///////////GET Drives//////////////////////////////////////////
///////////////////////////////////////////////////////////////

//Get a user's (others & mine) drive history
router.get("/rides/drives-history", checkAuth, (req, res) => {
  db.getDriveHistory(req.query.username, req.query.pageNum, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Get a user's (others & mine) upcoming drives
router.get("/rides/drives-upcoming", checkAuth, (req, res) => {
  db.getDriveUpcoming(req.query.username, req.query.pageNum, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Post a Ride
router.post("/rides/post-ride", checkAuth, (req, res) => {
  db.postRide(req.body.rideInfo, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

// //Join a Ride
// router.put("/rides/join-ride", checkAuth, (req, res) => {
//   const ride = JSON.parse(req.body.ride);
//   const passengerInfo = JSON.parse(req.body.user); //requires a GET MY USER INFO API CALL
//   db.joinRide(ride.ownerUsername, ride._id, passengerInfo, (err, data) => {
//     if (err) {
//       res.sendStatus(500);
//     } else {
//       res.status(200).send(data);
//     }
//   });
// });

//Cancel a Ride

//Modify Data of a Ride
router.put("/rides/rideList", checkAuth, (req, res) => {
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
router.delete("/rideList", checkAuth, (req, res) => {
  const ride = JSON.parse(req.body.ride);
  db.rideDelete(ride._id, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

module.exports = router;
