const express = require("express");
const router = new express.Router();

const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const rideDB = require("../ride/controller.js");
const userDB = require("../user/controller.js");

// Send back Stripe Public Key
router.get("/stripe/public-key", (req, res) => {
    res.status(200).send({ publicKey: process.env.STRIPE_PUBLIC_KEY });
});
  
// Create a Payment Intent
router.post("/stripe/create-payment-intent", (req, res) => {
  const rideID = req.body.ride_id;
  const spotsToBePurchased = req.body.spots_to_be_purchased;
  const authUsername = req.query.username;
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
                //customer: customer.stripeID,
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
                    res.status(200).json({ client_secret: paymentIntent.client_secret});
                    return;
                }
            }
          );
        }
      });    
    }
  });
});

  
// Webhook, handles events sent from Stripe
router.post('/stripe/webhook', async (req, res) => {
  let data;
  let eventType;

  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers["stripe-signature"];

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️ Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  if (eventType === "payment_intent.succeeded") {
    // Fulfill any orders, e-mail receipts, etc
    handlePaymentIntentSucceeded(data);
  }

  if (eventType === "payment_intent.payment_failed") {
    // Notify the customer that their order was not fulfilled
    console.log("❌ Payment failed.");
  }

  res.sendStatus(200);
});
  
const handlePaymentIntentSucceeded = (paymentIntent) => {
  console.log("💰 Payment received!");
  
  // Add User to ride
  db.joinRide(paymentIntent.metadata["ride"].ownerUsername, paymentIntent.metadata["ride"]._id, paymentIntent.metadata["customer_username"], (err, data) => {
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
  
  // TODO: Update Checkout_Session Object to a 'completed' status
  // TODO: Update Session object using paymentIntent.metadata["checkout_session_id"]
}
  
module.exports = router;