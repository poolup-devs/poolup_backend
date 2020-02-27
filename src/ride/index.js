const express = require("express");
const router = new express.Router();

//const Ride = require("./ride");
const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

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
      res.status(201).send(data);
    }
  });
});

//Join a Ride
router.put("/rides/join-ride", checkAuth, (req, res) => {
  const ride = req.body.ride; //need the _id and owner's username of the ride
  const authUsername = tokenParser(req.headers.authorization).username; //my username
  db.joinRide(ride.ownerUsername, ride._id, authUsername, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else if (data.length === 0) {
      res.status(404).send({
        message: "ERROR: The ride is full"
      });
    } else {
      res.status(200).send(data);
    }
  });
});

//Cancel a Ride
router.put("/rides/cancel-ride", checkAuth, (req, res) => {
  const ride = req.body.ride;
  const authUsername = tokenParser(req.headers.authorization).username;
  db.cancelRide(ride.ownerUsername, ride._id, authUsername, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else if (data.length === 0) {
      res.status(404).send({
        message: "ERROR: The ride is full"
      });
    } else {
      res.status(200).send(data);
    }
  });
});

// Cancel a ride, whether the user is a rider or a driver 
router.delete("/rides/cancel-ride", checkAuth, (req, res) => {
  // should only be able to cancel a ride if a user is a passenger of the ride or a driver in the ride 
  
  // if passenger: 
    // remove the passenger from the ride
    // increment their # of cancelled rides 
  // else (if driver)
    // notify all the passengers that the rider has cancelled 
    // delete the ride entirely 

  // const ride = req.body.ride;
  // const authUsername = tokenParser(req.headers.authorization).username;
  // if (ride.ownerUsername !== authUsername) {
  //   res.sendStatus(401);
  // }
  // db.deleteRide(ride._id, (err, data) => {
  //   if (err) {
  //     res.sendStatus(500);
  //   } else {
  //     res.status(200).send(data);
  //   }
  // });
})

router.get("/rides/get-rides-completed", async (req, res) => {
  const username = req.query.username 
  try {
    const ridesCompleted = await db.getRidesCompleted(username)
    res.status(200).send({ridesCompleted})
  }
  catch(e) {
    console.log(e) 
    res.status(500).send({error: e})
  }
})

module.exports = router;
