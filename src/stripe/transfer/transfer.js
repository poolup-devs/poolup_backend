const mongoose = require("mongoose");

const TransferSchema = mongoose.Schema({
  paymentIntentID: String,
  transferID: {
    type: String,
    default: ""
  },
  status: {
    type: String,
    default: "pending"
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
  timeBooked: Date, //TODO: Add to Readme
  expired: {
    type: Boolean,
    default: false
  },
  date: Date
});

const Transfer = mongoose.model("Transfer", TransferSchema);

module.exports = { Transfer };
