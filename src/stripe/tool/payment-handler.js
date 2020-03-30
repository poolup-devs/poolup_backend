const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const transferDB = require("../transfer/controller.js");
const rideDB = require("../../ride/controller.js");
const requestDB = require("../../request/controller.js");
const Transfer = require("../transfer/transfer").Transfer;

const handlePaymentIntentSucceeded = paymentIntent => {
  console.log("💰 Payment received!");

  const rideID = paymentIntent.meta["rideID"];
  const requestID = paymentIntent.meta["requestID"];
  const riderUsername = paymentIntent.meta["riderUsername"];
  const driverStripeAcct = paymentIntent.meta["driverStripeAcct"];

  // TODO: Make set request to paid status

  // Grab Ride Information
  rideDB.rideDetails(rideID, (err, ride) => {
    if (err) {
      // TODO: Better Error Handling
      console.log(err);
      return;
    }

    // Add User to ride
    rideDB.joinRide(ride.ownerUsername, riderUsername, (err, data) => {
      if (err) {
        // TODO: Better Error Handling
        // TODO: refund the amount back to the user
        console.log(err);
        return;
      } else if (data.length === 0) {
        // TODO: Better Error Handling
        // TODO: refund the amount back to the user
        console.log("Ride is Full");
        return;
      } else {
        var targetDate = new Date(ride.Date.getDate() + 1); // 24 hours after creation

        try {
          transferDB.createTransfer({
            paymentIntentID: paymentIntent.id,
            targetDate: targetDate,
            amount: paymentIntent.amount,
            rideID: rideID,
            destination: driverStripeAcct,
            customerUsername: riderUsername
          });
        } catch (e) {
          console.log("DRIVER TRANSFER FAILED: ", e);
        }

        try {
          requestDB.paidRequest({
            requestID: requestID
          });
        } catch (e) {
          console.log("Request set status to 'paid' FAILED: ", e);
        }
      }
    });
  });
};

const triggerTransfer = transfer => {
  stripe.transfers.create(
    {
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination
    },
    function(err, res) {
      if (err) {
        // TODO: Better Error Handling
        console.log(err);
      } else {
        transferDB.setStatusToComplete(
          { transferID: transfer.id },
          (err, data) => {
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
    refund_application_fee: false
  };

  // Driver Cancellation
  if (driverCancelled) {
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
    params.amount = params.amount / 2.0;

    // Create a tramsfer for driver
    try {
      transferDB.createTransfer({
        paymentIntentID: transfer.paymentIntentID,
        targetDate: transfer.targetDate,
        amount: params.amount,
        rideID: transfer.rideID,
        destination: transfer.driverStripeAcct,
        customerUsername: transfer.riderUsername
      });
    } catch (e) {
      console.log("Driver Create Transfer FAILED: ", e);
    }

    return params;
  }

  return params;
};

const didRiderBookAndCancelRightAfter = timeCancelled => {
  let timeBooked = transfer.booked;
  let timeBookedInAdvance = timeBooked - timeCancelled;
  let limit = 30;

  // Check if its within the limit or not
  if (timeBookedInAdvance <= limit) {
    return true;
  } else {
    return false;
  }
};

const didRiderCancelInAdvance = (rideID, timeCancelled) => {
  Ride.rideDetails(mongoose.Types.ObjectId(rideID), (err, data) => {
    if (err) {
      console.log(err);
      return false;
    } else {
      departureTime = data[0].date;

      let timeLeftBeforeDeparture = departureTime - timeCancelled;
      let limit = 24;

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
      stripe.refunds.create(params, function(err, refund) {
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
  refund
};
