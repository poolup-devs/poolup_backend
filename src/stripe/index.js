const express = require("express");
const router = new express.Router();

const checkAuth = require("../middleware/jwt_authenticator.js");
const querystring = require("querystring");
const tokenParser = require("../utils/token-parser.js");

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const userDB = require("../user/controller.js");
const paymentHandler = require("./tool/payment-handler.js");
const driverValidation = require("./tool/driver-info-validation.js");

// This endpoint is only used in the alpha version since stripe is not used
router.post("/driver/create", async (req, res) => {
  try {
    const authUsername = tokenParser(req.headers.authorization).username;
    const userDetails = await userDB.findUserByUsername(authUsername);

    // Check if a driver already has a stripe account ID
    // If they do then that means they already registered as a drive
    if (userDetails.driver.isDriver) {
      throw "User is already registered as a driver";
    }

    const driverInfo = {
      username: authUsername,
      phoneNumber: req.body.phoneNumber,
      licensePlate: req.body.licensePlate,
      vehicleMakeModel: req.body.vehicleMakeModel,
      driversLicense: req.body.driversLicense,
      vehicleColor: req.body.vehicleColor,
      stripeAccountID: "",
    };

    // Check that all the fields of the driverInfo object are populated
    if (!driverValidation.containsDriverInfo(driverInfo)) {
      throw "Invalid driver information; check that all fields are populated";
    }

    // Update the model and store the Stripe account ID in the datastore:
    // this Stripe account ID will be used to issue payouts to the driver
    await userDB.addUserDriverInfo(driverInfo);
    res.sendStatus(200);
  } catch (e) {
    res.status(400).json({
      error: e,
    });
  }
});

// Called when Stripe redirects from the account setup
router.get("/stripe/token", (req, res) => {
  const FRONT_END_URL = process.env.FRONT_END_URL;
  // Check that the session exists
  if (!req.session.username || !req.session.driverInfo) {
    console.log("Cookie containing driver info is missing");
    res.status(500).redirect(FRONT_END_URL + "/driver");
    return;
  }

  // Check state value in cookie to make sure it matches previous state
  if (req.session.state != req.query.state) {
    console.log("Stripe state does not match session state.");
    res.status(500).redirect(FRONT_END_URL + "/driver");
    return;
  }

  try {
    // Post the authorization code to Stripe to complete the Express onboarding flow
    stripe.oauth
      .token({
        grant_type: "authorization_code",
        code: req.query.code,
      })
      .then(function (response) {
        if (response.error) {
          throw response.error;
        }

        const driverInfo = {
          username: req.session.username,
          phoneNumber: req.session.driverInfo.phoneNumber,
          licensePlate: req.session.driverInfo.licensePlate,
          vehicleMakeModel: req.session.driverInfo.vehicleMakeModel,
          driversLicense: req.session.driverInfo.driversLicense,
          vehicleColor: req.session.driverInfo.vehicleColor,
          stripeAccountID: response.stripe_user_id,
        };

        // Update the model and store the Stripe account ID in the datastore:
        // this Stripe account ID will be used to issue payouts to the driver
        userDB.addUserDriverInfo(driverInfo, (err, data) => {
          if (err) {
            throw err;
          }

          // Redirect to the Driver onboarding page
          res.redirect(FRONT_END_URL + "/driver/my-drives");
        });
      })
      .catch((error) => {
        throw error;
      });
  } catch (err) {
    console.log(err);
    res.status(500).redirect(FRONT_END_URL + "/driver");
    return;
  }
});

// Redirect to Stripe Express for driver payment setup
router.post("/stripe/driver/auth", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;

  userDB.getMyInfo(authUsername, (err, userInfo) => {
    if (err) {
      res.status(500).send({
        error: err,
      });
      return;
    }

    // Check if a driver already has a stripe account ID
    // If they do then that means they already registered as a drive
    if (userInfo.driver.isDriver) {
      res.status(400).send({
        error: "User is already registered as a driver",
      });
      return;
    }

    // The username needs to be retreived when stripe redirects
    // back to /stripe/token after the oAuth is complete
    req.session.username = authUsername;

    const driverInfo = {
      phoneNumber: req.body.phoneNumber,
      licensePlate: req.body.licensePlate,
      vehicleMakeModel: req.body.vehicleMakeModel,
      driversLicense: req.body.driversLicense,
      vehicleColor: req.body.vehicleColor,
    };

    // Check that all the fields of the driverInfo object are populated
    if (!driverValidation.containsDriverInfo(driverInfo)) {
      console.log("Invalid driver info");
      res.send(400, {
        error:
          "Invalid driver information; check that all fields are populated",
      });
      return;
    }

    // Save the driver info to the session, it will be retrieved once stripe
    // redirects back to PoolUp
    req.session.driverInfo = driverInfo;

    //Generate a random string as `state` to protect from CSRF and include it in the session
    req.session.state = Math.random().toString(36).slice(2);

    // Populate the parameters that will be sent in the Stripe redirect. They will
    // be used to autopopulate some of the fields in the Stripe Express setup
    parameters = {
      client_id: process.env.STRIPE_CLIENT_ID,
      state: req.session.state,
      "stripe_user[business_type]": "individual",
      "stripe_user[email]": userInfo.email,
      "stripe_user[phone_number]": driverInfo.phoneNumber,
      "stripe_user[product_description]": "PoolUp Driver",
      "stripe_user[first_name]": userInfo.firstName,
      "stripe_user[last_name]": userInfo.lastName,
    };

    res.status(200).send({
      redirectUrl:
        "https://connect.stripe.com/express/oauth/authorize?" +
        querystring.stringify(parameters),
    });
    return;
  });
});

// Send back Stripe Public Key
router.get("/stripe/public-key", (req, res) => {
  res.status(200).send({ publicKey: process.env.STRIPE_PUBLIC_KEY });
});

// Send back Application Fee
router.get("/stripe/application-fee", (req, res) => {
  res
    .status(200)
    .send({ applicationFee: paymentHandler.getApplicationFeePercentage() });
});

// Create a Payment Intent
router.post("/stripe/create-payment-intent", async (req, res) => {
  const rideID = req.body.rideID;
  const requestID = req.body.requestID;
  const riderUsername = req.body.riderUsername;
  const currency = "usd";

  try {
    const clientSecret = await paymentHandler.createPaymentIntent(
      rideID,
      requestID,
      riderUsername,
      currency
    );
    res.status(200).send({ clientSecret: clientSecret });
  } catch (err) {
    res.status(err.status).send(err.message);
  }
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
    // Notify User
    try {
      await paymentHandler.handlePaymentIntentSucceeded(data);
    } catch (e) {
      console.log(e);
      // Cancel Payment Intent
      // Notify Frontend Webhook
      // Notify User
      // TODO what else can fail and how do we handle this
      // Cancel PaymentIntent and
      //  stripe.paymentIntents.cancel(paymentIntent.id, function (err, _) {
      //   if (err != nil) {
      //     console.log("Cancel PaymentIntent Failed");
      //     console.log(err);
      //   }
      // });
    }
  }

  if (eventType === "payment_intent.payment_failed") {
    // Notify the customer that their order was not fulfilled
    console.log("❌ Payment failed.");
  }

  res.send(200);
});

// =====================
// Development Endpoints
// =====================

// Trigger Payment Intent Success Flow
router.post("/stripe/dev/triggerSuccessfulPayment", async (req, res) => {
  try {
    const paymentIntent = req.body;
    await paymentHandler.handlePaymentIntentSucceeded(paymentIntent);
    res.sendStatus(200);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

// Trigger Refund
router.post("/stripe/dev/triggerRefund", async (req, res) => {
  try {
    const riderUsername = req.body.riderUsername;
    const rideID = req.body.rideID;
    const responsibleForCancellation = req.body.responsibleForCancellation;
    await paymentHandler.issueRefund(
      riderUsername,
      rideID,
      responsibleForCancellation
    );
    res.sendStatus(200);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

// Create Customer
router.post("/stripe/dev/customer", async (req, res) => {
  try {
    const data = await stripe.customers.create({
      description: "Some Customer",
    });
    res.status(200).send(data);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
});

module.exports = router;
