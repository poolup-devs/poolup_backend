const express = require("express");
const router = new express.Router();

const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const rideDB = require("../ride/controller.js");
const userDB = require("../user/controller.js");

// Send back Stripe Public Key
router.get("/stripe/public-key", checkAuth, (req, res) => {
    res.sendStatus(200).send({ publicKey: process.env.STRIPE_PUBLIC_KEY });
});
  
// Create a Payment Intent
router.post("/stripe/create-payment-intent", checkAuth, (req, res) => {
  const rideID = req.body.ride_id;
  const spotsToBePurchased = req.body.spots_to_be_purchased;
  const authUsername = tokenParser(req.headers.authorization).username;
  const currency = "usd";

  // Get Ride Details
  rideDB.rideDetails(rideID, (err, ride) => {
    if (err) {
      res.sendStatus(500);
      return;
    } else {
      
      // Get User Information
      userDB.getMyInfo(authUsername, (err, user) => {
        if (err) {
          console.log("Unable to get user information")
          res.sendStatus(500);
          return;
        } else {

          // Create Payment Intent
          stripe.paymentIntents.create(
            {
                amount: ride.price * spotsToBePurchased * 100,
                currency: currency,
                payment_method_types: ['card'],
                customer: customer.stripeID,
                metadata: {
                    "ride_id": rideID,
                    "customer_username": authUsername,
                    "checkout_session_id": "test",
                },
                receipt_email: "erick_suarez@ucsb.edu", // customer.email,
            },
            function(err, paymentIntent) {
                if(err) {
                    res.sendStatus(500);
                    return;
                } else {
                    res.status(200).send(paymentIntent.client_secret);
                    return;
                }
            }
          );
        }
      });    
    }
  });
});
  
module.exports = router;