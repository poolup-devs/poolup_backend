const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const transferDB = require("../transfer/controller.js");
const rideDB = require("../../ride/controller.js");

const handlePaymentIntentSucceeded = paymentIntent => {
  console.log("💰 Payment received!");

  const rideID = paymentIntent.meta["rideID"];
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

        transferDB.createTransfer(
          {
            paymentIntentID: paymentIntent.id,
            targetDate: targetDate,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            rideID: rideID,
            destination: driverStripeAcct,
            customerUsername: riderUsername
          },
          (err, transfer) => {
            if (err) {
              // TODO: Better Error Handling
              console.log(err);
              return;
            } else {
              console.log("Transfer Scheduled: ", transfer);
            }
          }
        );
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
        // TODO: Send Transfer Success Notification

        // TODO: Update Transfer Object
        // transferDB.transferSuccessUpdate(
        //   { transferID: transfer.id },
        //   (err, data) => {
        //     if (err) {
        //       console.log(err);
        //     } else {
        //       console.log("Update Successful");
        //     }
        //   }
        // );
        console.log(res);
      }
    }
  );
};

const refund = (riderUsername, rideID, callback) => {
  query = { customerUsername: riderUsername, rideID: rideID };

  // Validate Transfer
  Transfer.findTransfer(query, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      transfer = result[0];

      if (transfer.status !== "scheduled") {
        callback("Refund Failed: Transfer status is " + transfer.status, null);
        return;
      }
    }
  });

  // Issue Refund
  stripe.refunds.create(
    {
      payment_intent: paymentIntentID
    },
    function(err, refund) {
      if (err) {
        callback(err, null);
      } else {
        const filter = { _id: transferID };
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
    }
  );
};

module.exports = {
  handlePaymentIntentSucceeded,
  triggerTransfer,
  refund
};
