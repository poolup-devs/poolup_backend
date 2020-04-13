const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const transferDB = require("../transfer/controller.js");
const requestDB = require("../../request/controller.js");
const userDB = require("../../user/controller.js");
const mongoose = require("mongoose");
const rideDB = require("../../ride/controller.js");
const Transfer = require("../transfer/transfer").Transfer;
const Ride = require("../../ride/ride").Ride;

const handlePaymentIntentSucceeded = (paymentIntent) => {
  console.log("💰 Payment received!");
  const rideID = paymentIntent.metadata["rideID"];
  const requestID = paymentIntent.metadata["requestID"];
  const riderUsername = paymentIntent.metadata["riderUsername"];

  // Grab Ride Information
  rideDB.rideDetails(mongoose.Types.ObjectId(rideID), (err, ride) => {
    if (err) {
      console.log("Ride Details Failed");
      console.log(err);

      // Cancel PaymentIntent
      stripe.paymentIntents.cancel(paymentIntent.id, function (err, _) {
        if (err != nil) {
          console.log("Cancel PaymentIntent Failed");
          console.log(err);
        }
      });

      // TODO: Return error to frontend
      return err;
    }

    // Add User to ride
    rideDB.joinRide(ride.ownerUsername, rideID, riderUsername, (err, data) => {
      if (err) {
        console.log("Join Ride Failed", err);

        // Cancel PaymentIntent
        stripe.paymentIntents.cancel(paymentIntent.id, function (err, _) {
          if (err != nil) {
            console.log("Cancel PaymentIntent Failed: ", err);
          }
        });

        // TODO: Return error to frontend
        return err;
      } else {
        var targetDate = new Date(ride.date.getDate() + 1); // Triggers immediately

        stripe.paymentIntents.capture(paymentIntent.id, function (
          err,
          paymentIntent
        ) {
          if (err) {
            console.log("Capture PaymentIntent Failed: ", err);
            return err;
          } else {
            userDB.getMyInfo(ride.ownerUsername, (err, driverInfo) => {
              if (err) {
                return err;
              } else {
                try {
                  transferDB.createTransfer({
                    paymentIntentID: paymentIntent.id,
                    targetDate: targetDate,
                    amount: paymentIntent.amount,
                    rideID: rideID,
                    destination: driverInfo.stripe.accountID,
                    customerUsername: riderUsername,
                  });
                } catch (e) {
                  console.log("DRIVER TRANSFER FAILED: ", e);
                  return e;
                }

                try {
                  if (requestID != "") {
                    requestDB.paidRequest({
                      requestID: requestID,
                    });
                  }
                } catch (e) {
                  console.log("Request set status to 'paid' FAILED: ", e);
                  return e;
                }
              }
            });
          }
        });
      }
    });
  });
};

const triggerTransfer = (transfer) => {
  stripe.transfers.create(
    {
      amount: transfer.amount,
      currency: transfer.currency,
      source_transaction: transfer.paymentIntentID,
      destination: transfer.destination,
      transfer_group: transfer.rideID,
    },
    function (err, res) {
      if (err) {
        // TODO: Better Error Handling
        console.log(err);
      } else {
        transferDB.setStatusToComplete(
          { transferID: transfer.id },
          (err, _) => {
            if (err) {
              console.log(err);
            } else {
              console.log("Update Successful");

              // TODO: Send Transfer Success Notification
            }
          }
        );
        console.log(res);
      }
    }
  );
};

const policyChecker = (transfer, driverCancelled) => {
  let timeCancelled = Date.now();

  let params = {
    payment_intent: transfer.paymentIntentID,
    amount: transfer.amount,
    refund_application_fee: false,
  };

  const applicationFeePercentage =
    parseFloat(process.env.STRIPE_APPLICATION_FEE) || 0;

  // Driver Cancellation
  if (driverCancelled && applicationFeePercentage > 0) {
    params.refund_application_fee = true;
    return params;
  }

  // Rider Cancellations
  let cancelledInAdvance = didRiderCancelInAdvance(
    transfer.rideID,
    timeCancelled
  );

  let bookedAndCancelledRightAfter = didRiderBookAndCancelRightAfter(
    timeCancelled
  );

  if (!cancelledInAdvance && !bookedAndCancelledRightAfter) {
    params.amount = Math.floor(params.amount / 2);

    // Create a tramsfer for driver
    try {
      triggerTransfer({
        paymentIntentID: transfer.paymentIntentID,
        targetDate: transfer.targetDate,
        amount: params.amount,
        rideID: transfer.rideID,
        destination: transfer.driverStripeAcct,
        customerUsername: transfer.riderUsername,
      });
    } catch (e) {
      console.log("Driver Create Transfer FAILED: ", e);
    }

    return params;
  }

  return params;
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
  Ride.findOne(rideID, (err, ride) => {
    if (err) {
      console.log(err);
      return false;
    } else {
      departureTime = ride.date;
      const MS_PER_HOUR = 1000 * 60 * 60;
      let timeLeftBeforeDeparture = Math.floor(
        (departureTime - timeCancelled) / MS_PER_HOUR
      );
      let limit = parseFloat(process.env.FLAKER_LIMIT) || 24;

      // Check if its within the limit or not
      if (timeLeftBeforeDeparture > limit) {
        return true;
      } else {
        return false;
      }
    }
  });
};

const refund = (riderUsername, rideID, driverCancelled, callback) => {
  let query = { customerUsername: riderUsername, rideID: rideID };

  // Validate Transfer
  Transfer.findOne(query, (err, transfer) => {
    if (err) {
      callback(err, null);
    } else {
      if (transfer.status !== "scheduled") {
        callback("Refund Failed: Transfer status is " + transfer.status, null);
        return;
      }

      let params = policyChecker(transfer, driverCancelled);

      // Issue Refund
      stripe.refunds.create(params, function (err, refund) {
        if (err) {
          callback(err, null);
        } else {
          console.log(refund);
          const filter = { _id: transfer._id };
          const update = { $set: { status: "refunded" } };
          const options = { new: true };

          // Update Status
          Transfer.findOneAndUpdate(
            filter,
            update,
            options,
            (updateErr, result) => {
              if (updateErr) {
                callback(updateErr, null);
              } else {
                callback(null, result);
              }
            }
          );
        }
      });
    }
  });
};

module.exports = {
  handlePaymentIntentSucceeded,
  triggerTransfer,
  refund,
};
