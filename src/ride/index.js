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
  const ride = req.body.ride;
  const authUsername = tokenParser(req.headers.authorization).username;
  const numOfSeats = req.body.numOfSeats;
  const applicationFeeAmount = 0;
  const savePaymentMethod = 0;

  if (numOfSeats <= 0) {
    console.log("Invalid number of seats requested");
    res.sendStatus(500);
  }

  // Get customer object
  userStripeID = "user.stripeID"
  userEmail

  // Set up Stripe object
  var stripe = require('stripe')(process.env.STRIPE_API_KEY);

  // Create Payment Intent and Confirm
  stripe.paymentIntents.create(
    {
      amount: ride.price * numOfSeats,
      currency: 'usd',
      payment_method_types: ['card'],
      application_fee_amount: applicationFeeAmount,
      confirm: true,
      off_session: true,
      customer: userStripeID,
      receipt_email: userEmail,
    },
    function(err, paymentIntent) {
      if (err) {
        res.sendStatus(500);
        return;
      }

      // Capture the Charge
      stripe.charges.capture(
        paymentIntent.id,
        function(err, charge) {
          if (err) {
            res.sendStatus(500);
            return;
          }

          //TODO: Update Ride
        }
      );
    }
  );

  // Add user to ride
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

//Delete a ride
router.delete("/rides/delete-ride", checkAuth, (req, res) => {
  const ride = req.body.ride;
  const authUsername = tokenParser(req.headers.authorization).username;
  if (ride.ownerUsername !== authUsername) {
    res.sendStatus(401);
  }
  db.rideDelete(ride._id, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

module.exports = router;
