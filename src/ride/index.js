const express = require("express");
const router = new express.Router();
const mongoose = require("mongoose");
const db = require("./controller.js");
const request = require("../request/controller.js");
const scheduler = require("../tasks/scheduler.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

//Get List of Available/ future Rides
router.get("/rides/matching-rides", async (req, res) => {
  try {
    const data = await db.getMatchingRides(req.query.filter, req.query.pageNum);
    return res.status(200).send(data);
  } catch (err) {
    return res.status(err.status).send(err.message);
  }
});

//Get another user's ride history
router.get("/rides/user-rides-history", checkAuth, async (req, res) => {
  try {
    const data = await db.getRideHistory(req.query.username);
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

//Get my ride history
router.get("/rides/my-rides-history", checkAuth, async (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  try {
    const data = await db.getMyRideHistory(authUsername, req.query.pageNum);
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

//Get my ride upcoming
router.get("/rides/my-rides-upcoming", checkAuth, async (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  try {
    const data = await db.getMyRideUpcoming(authUsername);
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

//Get a user's (others & mine) drive history
router.get("/rides/drives-history", checkAuth, async (req, res) => {
  try {
    const data = await db.getDriveHistory(
      req.query.username,
      req.query.pageNum
    );
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

//Get a user's (others & mine) drive history
router.delete("/rides/delete-ride", checkAuth, async (req, res) => {
  try {
    await request.archiveRemainingRideRequests(req.body.ride._id);
    scheduler.cancelTasksAssociatedWithRide(req.body.ride._id);
    res.status(200);
  } catch (err) {
    console.log(err.message);
    res.status(err.status).send(err.message);
  }
});

//Get a user's (others & mine) upcoming drives
router.get("/rides/drives-upcoming", checkAuth, async (req, res) => {
  try {
    const data = await db.getDriveUpcoming(
      req.query.username,
      req.query.pageNum
    );
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

//Post a Ride
router.post("/rides/post-ride", checkAuth, async (req, res) => {
  try {
    const data = await db.postRide(req.body.rideInfo);
    res.status(201).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

//Join a Ride manually
router.put("/rides/join-ride", checkAuth, async (req, res) => {
  const ride = req.body.ride;
  const authUsername = tokenParser(req.headers.authorization).username;

  try {
    const data = await db.joinRide(ride.ownerUsername, ride._id, authUsername);
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

//Cancel a Ride
router.put("/rides/cancel-ride", checkAuth, async (req, res) => {
  const ride = req.body.ride;
  const cancellationReason = req.body.cancellationReason;
  if (req.body.messageToDriver) {
    var messageToDriver = req.body.messageToDriver;
  } else {
    var messageToDriver = null;
  }

  const authUsername = tokenParser(req.headers.authorization).username;

  try {
    const msg = await db.cancelRide(
      ride._id,
      authUsername,
      cancellationReason,
      messageToDriver
    );

    res.status(200).send(msg);
  } catch (e) {
    res.status(500).send({ error: e });
  }
});

//Get Ride Details
router.get("/rides/ride-details", checkAuth, async (req, res) => {
  var rideID = req.query.rideID;

  try {
    const data = await db.rideDetails(mongoose.Types.ObjectId(rideID));
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
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
