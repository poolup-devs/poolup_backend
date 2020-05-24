const express = require("express");
const router = new express.Router();
const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");
const errResp = require("../utils/errors/errResponse");

//Get List of Available/ future Rides
router.get("/rides/matching-rides", async (req, res) => {
  try {
    const data = await db.getMatchingRides(req.query.filter, req.query.pageNum);
    return res.status(200).send(data);
  } catch (err) {
    return errResp(res, err);
  }
});

//Get a user's ride history
router.get("/rides/user-rides-history", checkAuth, async (req, res) => {
  try {
    const data = await db.getRideHistory(req.query.username, req.query.pageNum);
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Get my ride history
router.get("/rides/my-rides-history", checkAuth, async (req, res) => {
  const authUsername = await tokenParser(req.headers.authorization);
  try {
    const data = await db.getRideHistory(authUsername, req.query.pageNum);
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Get my ride upcoming
router.get("/rides/my-rides-upcoming", checkAuth, async (req, res) => {
  const authUsername = await tokenParser(req.headers.authorization);
  try {
    const data = await db.getMyRideUpcoming(authUsername, req.query.pageNum);
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Get a user's (others & mine) drive history
router.get("/rides/drives-history", checkAuth, async (req, res) => {
  try {
    const data = await db.getDriveHistory(req.query.username, req.query.pageNum);
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Get a user's (others & mine) upcoming drives
router.get("/rides/drives-upcoming", checkAuth, async (req, res) => {
  try {
    const data = await db.getDriveUpcoming(req.query.username, req.query.pageNum);
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Post a Ride
router.post("/rides/post-ride", checkAuth, async (req, res) => {
  try {
    var authUsername = await tokenParser(req.headers.authorization);

    const data = await db.postRide(req.body.rideInfo, authUsername);
    res.status(201).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Join a Ride manually
router.put("/rides/join-ride", checkAuth, async (req, res) => {
  try {
    var authUsername = await tokenParser(req.headers.authorization);

    const data = await db.joinRide(req.body.ride, authUsername);
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Cancel a Ride
router.put("/rides/cancel-ride", checkAuth, async (req, res) => {
  try {
    const ride = req.body.ride;
    const cancellationReason = req.body.cancellationReason;
    if (req.body.messageToDriver) {
      var messageToDriver = req.body.messageToDriver;
    } else {
      var messageToDriver = null;
    }
    const authUsername = await tokenParser(req.headers.authorization);

    const msg = await db.cancelRide(ride._id, authUsername, cancellationReason, messageToDriver);

    res.status(200).send(msg);
  } catch (err) {
    errResp(res, err);
  }
});

// Get a ride from the database by querying with its rideId
router.get("/rides/rideDetails", checkAuth, async (req, res) => {
  let rideID = req.query.rideID;
  try {
    const data = await db.getRideDetails(mongoose.Types.ObjectId(rideID));
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

// Get List of Cities
router.get("/rides/getAvailableCities", (req, res) => {
  const places = require("./places.json");

  let cities = Object.values(places);
  var merged = [].concat.apply([], cities).sort();

  res.status(200).json(merged);
});

// Get List of Counties
router.get("/rides/getAvailableCounties", (req, res) => {
  const places = require("./places.json");

  let counties = Object.keys(places).sort();

  res.status(200).json(counties);
});

module.exports = router;
