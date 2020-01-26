const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const TransferDB = require("../transfer/controller.js");

const handlePaymentIntentSucceeded = paymentIntent => {
  console.log("💰 Payment received!");

  // Add User to ride
  db.joinRide(W, (err, data) => {
    if (err) {
      res.sendStatus(500);

      // TODO: refund the amount back to the user
    } else if (data.length === 0) {
      res.status(404).send({
        message: "ERROR: The ride is full"
      });

      // TODO: refund the amount back to the user
    } else {
      TransferDB.createTransfer(
        {
          paymentIntentID: paymentIntent.id,
          targetDate: targetDate,
          rideID: rideID
        },
        (err, data) => {
          if (err) {
            // Better Error handling, what do we do if it fails
            // Currently its just gonna keep retrying and print
            // out on console. Maybe we could send out notification
            console.log(err);
          } else {
            res.status(200).send(data);
          }
        }
      );
    }
  });
};

const triggerTransfer = transfer => {
  stripe.transfers.create(
    {
      amount: transfer.amount,
      currency: transfer.amount,
      destination: transfer.destination
    },
    function(err, transfer) {
      // asynchronously called
      if (err) {
        // Better Error handling, what do we do if it fails
        // Currently its just gonna keep retrying and print
        // out on console. Maybe we could send out notification
        console.log(err);
      } else {
        //TODO: Send Transfer Success Notification
        // Update Transfer Object
        // TransferDB.transferSuccessUpdate(
        //   { transferID: transfer.id },
        //   (err, data) => {
        //     if (err) {
        //       console.log(err);
        //     } else {
        //       console.log("Update Successful");
        //     }
        //   }
        // );
      }
    }
  );
};
