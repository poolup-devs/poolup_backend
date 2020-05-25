const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const transferDB = require("../transfer/controller.js");
const requestDB = require("../../request/controller.js");
const userDB = require("../../user/controller.js");
const rideDB = require("../../ride/controller.js");
const Transfer = require("../transfer/transfer").Transfer;
const Ride = require("../../ride/ride").Ride;
// ====================================================
// Public Functions
// ====================================================

const createPaymentIntent = (rideID, requestID, riderUsername, currency) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Get Ride Details
      const rideDetails = await Ride.findById(rideID);
      if (rideDetails.seats < 1) {
        return reject("Not Enough Seats In Ride");
      }

      // Get Rider and Driver Details
      const riderDetails = await userDB.findUserByUsername(riderUsername);
      const driverDetails = await userDB.findUserByUsername(
        rideDetails.ownerUsername
      );

      // Calculate Application Fee and Total Amount To Charge
      const applicationFee =
        parseFloat(rideDetails.price) * getApplicationFeePercentage();
      const totalAmount = parseFloat(rideDetails.price) + applicationFee;

      const options = {
        amount: totalAmount * 100,
        currency: currency,
        payment_method_types: ["card"],
        customer: riderDetails.stripe.customerID,
        capture_method: "manual",
        metadata: {
          rideID: rideID,
          requestID: requestID,
          riderUsername: riderUsername,
          driverStripeAcct: driverDetails.stripe.accountID,
          applicationFee: applicationFee,
        },
        receipt_email: riderDetails.email,
      };

      // Send Create Payment Intent Request to Stripe
      const paymentIntent = await stripe.paymentIntents.create(options);
      return resolve(paymentIntent.client_secret);
    } catch (err) {
      return reject(err);
    }
  });
};

const handlePaymentIntentSucceeded = (paymentIntent) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Payment Intent Successful");
      console.log("Attempting to Capture Payment...");

      // Grab Fields from PaymentIntent MetaData
      const rideID = paymentIntent.metadata["rideID"];
      const requestID = paymentIntent.metadata["requestID"];
      const riderUsername = paymentIntent.metadata["riderUsername"];
      const applicationFee = paymentIntent.metadata["applicationFee"];
      const driverStripeAcct = paymentIntent.metadata["driverStripeAcct"];

      // Get Ride Details
      const rideDetails = await Ride.findById(rideID);

      // Add User to Specified Ride
      await rideDB.joinRide(rideDetails.ownerUsername, rideID, riderUsername);

      // Trigger PaymentIntent Capture
      const result = await stripe.paymentIntents.capture(paymentIntent.id);
      console.log("💰 Payment Captured!");
      const chargeID = result.charges.data[0].id;

      // Create Transfer
      // var targetDate = new Date(rideDetails.date.getDate() + 1); // 24 hours after
      var targetDate = new Date();

      const transfer = await transferDB.createTransfer({
        paymentIntentID: paymentIntent.id,
        targetDate: targetDate,
        amount: rideDetails.price * 100,
        rideID: rideID,
        destination: driverStripeAcct,
        customerUsername: riderUsername,
        applicationFee: applicationFee,
        sourceTransaction: chargeID,
      });
      console.log("Transfer Created");

      // Set Ride Request Status to Paid not booked through instant booking
      if (requestID != "") {
        await requestDB.updateRequestStatus(requestID, riderUsername, "paid");
      }

      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
};

const triggerTransfer = (transfer) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Initiating Transfer...");
      console.log(transfer);
      const res = await stripe.transfers.create({
        amount: transfer.amount,
        currency: transfer.currency,
        destination: transfer.destination,
        transfer_group: transfer.rideID,
        source_transaction: transfer.sourceTransaction,
      });

      console.log("Transfer Completed");
      await transferDB.updateTransferStatus(transfer._id, "completed");
      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
};

const issueRefund = (riderUsername, rideID, responsibleForCancellation) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("Initiating Refund...");

      // Immediately Block Transfer
      const query = { customerUsername: riderUsername, rideID: rideID };
      const transferDetails = await Transfer.findOne(query);
      await transferDB.updateTransferStatus(transferDetails._id, "blocked");

      // Get Appropriate Stripe Refund Options Depending on Policies
      let options = policyChecker(transfer, responsibleForCancellation);

      // Issue Refund
      await stripe.refunds.create(options);

      // Update Transfer Status
      await transferDB.updateTransferStatus(transferDetails._id, "refunded");

      return resolve();
    } catch (err) {
      return reject(err);
    }
  });
};

const getApplicationFeePercentage = () => {
  const applicationFeePercentage =
    parseFloat(process.env.STRIPE_APPLICATION_FEE) || 0;

  if (applicationFeePercentage < 0 || applicationFeePercentage >= 1) {
    applicationFeePercentage = 0;
  }

  return applicationFeePercentage;
};
// ====================================================
// Private Functions
// ====================================================

const policyChecker = (transfer, responsibleForCancellation) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Default: Full Refund - Application Fee
      let params = {
        payment_intent: transfer.paymentIntentID,
        amount: transfer.amount,
      };

      // Driver Cancellation: Full Refund
      if (responsibleForCancellation === "driver") {
        params.amount = params.amount + transfer.applicationFee;
        return resolve(params);
      }

      // Rider Cancellations
      const timeCancelled = Date.now();

      const cancelledInAdvance = didRiderCancelInAdvance(
        transfer.rideID,
        timeCancelled
      );

      const bookedAndCancelledRightAfter = didRiderBookAndCancelRightAfter(
        timeCancelled
      );

      if (!cancelledInAdvance && !bookedAndCancelledRightAfter) {
        // Set Partial Refund for Rider
        params.amount = Math.floor(params.amount / 2);

        // Create a Transfer with Partial Amount for Driver
        await transferDB.createTransfer({
          paymentIntentID: transfer.paymentIntentID,
          targetDate: Date.now(),
          amount: params.amount,
          rideID: transfer.rideID,
          destination: transfer.driverStripeAcct,
          customerUsername: transfer.riderUsername,
          applicationFee: transfer.applicationFee,
          sourceTransaction: transfer.sourceTransaction,
        });
      }

      return resolve(params);
    } catch (err) {
      return reject(err);
    }
  });
};

const didRiderBookAndCancelRightAfter = (timeCancelled) => {
  const MS_PER_MIN = 1000 * 60;
  let timeBooked = transfer.date;
  let timeBookedInAdvance = Math.floor(
    (timeBooked - timeCancelled) / MS_PER_MIN
  );
  let limit = parseFloat(process.env.INDECISION_LIMIT) || 30;

  // Check if its within the limit or not
  if (timeBookedInAdvance <= limit) {
    return true;
  } else {
    return false;
  }
};

const didRiderCancelInAdvance = (rideID, timeCancelled) => {
  return new Promise(async (resolve, reject) => {
    try {
      const rideDetails = await Ride.findOne(rideID);
      const departureTime = rideDetails.date;
      const MS_PER_HOUR = 1000 * 60 * 60;
      let timeLeftBeforeDeparture = Math.floor(
        (departureTime - timeCancelled) / MS_PER_HOUR
      );
      let limit = parseFloat(process.env.FLAKER_LIMIT) || 24;

      // Check if its within the limit or not
      if (timeLeftBeforeDeparture > limit) {
        return resolve(true);
      } else {
        return resolve(false);
      }
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  createPaymentIntent,
  handlePaymentIntentSucceeded,
  triggerTransfer,
  issueRefund,
  getApplicationFeePercentage,
};
