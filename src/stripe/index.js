const express = require("express");
const router = new express.Router();

const checkAuth = require("../middleware/jwt_authenticator.js");
const querystring = require("querystring");
const tokenParser = require("../utils/token-parser.js");
const bodyParser = require("body-parser");
const handlePaymentIntentSucceeded = require("./tool/payment-handler.js")
  .handlePaymentIntentSucceeded;

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const rideDB = require("../ride/controller.js");
const userDB = require("../user/controller.js");
const TransferDB = require("./transfer/controller.js");
const driverValidation = require("./tool/driver-info-validation.js");

router.post("/driver/create", (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;

  userDB.findUserByUsername(authUsername, (err, data) => {
    if (err) {
      res.status(500).json({
        error: err,
      });
      return;
    }
    //Get the user info from the database request
    const userInfo = data[0];

    // Check if a driver already has a stripe account ID
    // If they do then that means they already registered as a drive
    if (userInfo.driver.isDriver) {
      res.status(400).json({
        error: "User is already registered as a driver",
      });
      return;
    }

    const driverInfo = {
      username: authUsername,
      phoneNumber: req.body.phoneNumber,
      licensePlate: req.body.licensePlate,
      vehicleMakeModel: req.body.vehicleMakeModel,
      driversLicense: req.body.driversLicense,
      vehicleColor: req.body.vehicleColor,
    };

    // Check that all the fields of the driverInfo object are populated
    if (!driverValidation.containsDriverInfo(driverInfo)) {
      console.log("Invalid driver info");
      res.status(400).json({
        error:
          "Invalid driver information; check that all fields are populated",
      });
      return;
    }

    // Update the model and store the Stripe account ID in the datastore:
    // this Stripe account ID will be used to issue payouts to the driver
    userDB.addUserDriverInfo(driverInfo, (err, data) => {
      if (err) {
        console.log(err);
        res.status(400).json({
          error: "Unable to create driver account",
        });
      }

      res.sendStatus(200);
      return;
    });
  });
});

// Send back Stripe Public Key
router.get("/stripe/public-key", (req, res) => {
  res.status(200).send({ publicKey: process.env.STRIPE_PUBLIC_KEY });
});

// Create Account
router.post("/stripe/account", (req, res) => {
  const country = req.body.country;
  const email = req.body.email;

  stripe.accounts.create(
    {
      type: "custom",
      country: country,
      email: email,
      requested_capabilities: ["card_payments", "transfers"],
    },
    function (err, customer) {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({ account: customer });
      }
    }
  );
});

// Create Customer
router.post("/stripe/customer", (req, res) => {
  stripe.customer.create(
    {
      description: "Some Customer",
    },
    function (err, customer) {
      if (err) {
        res.status(500).json({ error: err });
      } else {
        res.status(200).json({ customer: customer });
      }
    }
  );
});

// Create a Payment Intent
router.post("/stripe/create-payment-intent", (req, res) => {
  const rideID = req.body.rideID;
  const spotsToBePurchased = req.body.spotsToBePurchased;
  const riderUsername = req.body.username;
  const currency = "usd";

  // Get Ride Details
  rideDB.rideDetails(rideID, (err, ride) => {
    if (err) {
      res.status(500).json({ error: err });
      return;
    } else if (!ride) {
      res.status(404).json({ error: "Ride not found: " + rideID });
      return;
    }

    // Get Rider Details
    userDB.getUserInfo(riderUsername, (err, rider) => {
      if (err) {
        res.status(500).json({ error: err });
        return;
      }

      // Get Driver Details
      userDB.getUserInfo(ride.ownerUsername, (err, driver) => {
        if (err) {
          res.status(500).json({ error: err });
          return;
        }

        var amount = ride.price * spotsToBePurchased * 100;

        // Create Payment Intent
        stripe.paymentIntents.create(
          {
            amount: amount,
            currency: currency,
            payment_method_types: ["card"],
            customer: rider.stripe.customerID,
            metadata: {
              rideID: rideID,
              riderUsername: riderUsername,
              driverStripeAcct: driver.stripe.accountID,
            },
            receipt_email: rider.email,
          },
          function (err, paymentIntent) {
            if (err) {
              console.log(err);
              res.status(500).json({ error: err });
              return;
            } else {
              res
                .status(200)
                .json({ clientSecret: paymentIntent.client_secret });
              return;
            }
          }
        );
      });
    });
  });
});

// Webhook, handles events sent from Stripe
router.post("/stripe/webhook", async (req, res) => {
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

// Tester Endpoint
router.get("/stripe/test", async (req, res) => {
  try {
    const testDate = new Date();
    testDate.setDate(testDate.getDate() - 1);
    const testID = "1";
    const testoUsername = "oef";
    const testcUsername = "asdf";

    const test = await TransferDB.createTransfer({
      paymentIntentID: "1234",
      targetDate: testDate,
      amount: 100,
      rideID: "",
      destination: "cus_GcWwbWaTlAojQS",
      customerUsername: "adf",
    });
    // const test = await TransferDB.checkExpired();
    res.send(test).status(200);
  } catch (e) {
    res.send(e).status(400);
  }
});
module.exports = router;
