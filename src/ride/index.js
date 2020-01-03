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

//Join a Ride manually
router.put("/rides/join-ride", checkAuth, (req, res) => {
  const ride = req.body.ride;
  const authUsername = tokenParser(req.headers.authorization).username;
  
  // Add User to ride
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

//Get Ride Details
router.get("/ride-details", (req, res) => {
  const rideID = req.body.ride_id;

  db.rideDetails(rideID, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

// ======================================================
// STRIPE: TODO: Move over stripe stuff on new folder
// ======================================================

// Send back Stripe Public Key
router.get("/public-key", (req, res) => {
  res.send({ publicKey: process.env.STRIPE_API_KEY });
});

// Create a Payment Intent
router.post("/rides/create-payment-intent", checkAuth, (req, res) => {
  const rideID = req.body.ride_id;
  const spotsToBePurchased = req.body.spots_to_be_purchased;
  const authUsername = tokenParser(req.headers.authorization).username;
  const currency = "usd";
  let customer;
  let ride;

  // Get Ride Details
  db.rideDetails(rideID, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      ride = data;
    }
  });

  // Get User Information
  db.getMyInfo(authUsername, (err, user) => {
    if (err) {
      console.log("Unable to get user information")
      res.sendStatus(500);
    } else {
       customer = user;
    }
  });

  // Set up stripe object
  const stripe = require('stripe')(process.env.STRIPE_API_KEY);

  // Send back the client secret of the Payment Intent
  stripe.paymentIntents.create(
    {
      amount: ride.price * spotsToBePurchased,
      currency: currency,
      payment_method_types: ['card'],
      customer: customer.stripeID,
      metadata: {
        "ride_id": ride._id,
        "customer_username": authUsername,
        "checkout_session_id": "test",
      },
      receipt_email: customer.email, 
    },
    function(err, paymentIntent) {
      if(err) {
        res.sendStatus(500);
      } else {
        res.sendStatus(200).send(paymentIntent.client_secret);
      }
    }
  );
});

// Use body-parser to retrieve the raw body as a buffer
// const bodyParser = require('body-parser');

// Webhook, handles events sent from Stripe
// app.post('/webhook', bodyParser.raw({type: 'application/json'}), (request, response) => {
//   let event;

//   try {
//     event = JSON.parse(request.body);
//   }
//   catch (err) {
//     response.status(400).send(`Webhook Error: ${err.message}`);
//   }

//   // Handle the event
//   switch (event.type) {
//     case 'payment_intent.succeeded':
//       const paymentIntent = event.data.object;
//       handlePaymentIntentSucceeded(paymentIntent);
//       break;
//     // ... handle other event types
//     default:
//       // Unexpected event type
//       return response.status(400).end();
//   }

//   // Return a response to acknowledge receipt of the event
//   response.json({received: true});
// });

// const handlePaymentIntentSucceeded = (paymentIntent) => {
    
//   // Add User to ride
//   db.joinRide(paymentIntent.metadata["ride"].ownerUsername, paymentIntent.metadata["ride"]._id, paymentIntent.metadata["customer_username"], (err, data) => {
//     if (err) {
//       res.sendStatus(500);
//     } else if (data.length === 0) {
//       res.status(404).send({
//         message: "ERROR: The ride is full"
//       });
//     } else {
//       res.status(200).send(data);
//     }
//   });

//   // Update Checkout_Session Object to a 'completed' status
//   // Update Session object using paymentIntent.metadata["checkout_session_id"]
// }

module.exports = router;
