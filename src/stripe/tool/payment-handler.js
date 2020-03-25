const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const transferDB = require("../transfer/controller.js");
const rideDB = require("../../ride/controller.js");

const handlePaymentIntentSucceeded = paymentIntent => {
  console.log("💰 Payment received!");

  const rideID = paymentIntent.meta["rideID"];
  const riderUsername = paymentIntent.meta["riderUsername"];
  const driverStripeAcct = paymentIntent.meta["driverStripeAcct"];

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
            destination: driverStripeAcct
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
