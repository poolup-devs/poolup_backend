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
  rideID: String,
  destination: String,
  customerUsername: String,
  expired: {
    type: Boolean,
    default: false
  },
  date: Date
});

const Transfer = mongoose.model("Transfer", TransferSchema);

module.exports = { Transfer };
