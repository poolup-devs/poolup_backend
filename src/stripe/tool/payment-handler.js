const handlePaymentIntentSucceeded = (paymentIntent) => {
    console.log("💰 Payment received!");
    
    // Add User to ride
    db.joinRide(W, (err, data) => {
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

const triggerIntentBeta = (intentBetas) => {
    // Whatever you want here Mr.Suarezzzz
}