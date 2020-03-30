const mongoose = require("mongoose");

const TransferSchema = mongoose.Schema({
  paymentIntentID: String,
  status: {
    type: String,
    default: "scheduled"
  },
  targetDate: Date,
  amount: Number,
  currency: {
    type: String,
    default: "usd"
  },
  rideID: String, // Change to mongo object id
  destination: String, // Stripe Connected Account ID
  customerUsername: String,
  expired: {
    type: Boolean,
    default: false
  },
  date: Date
});

const Transfer = mongoose.model("Transfer", TransferSchema);

module.exports = { Transfer };
