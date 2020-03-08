const mongoose = require("mongoose");

const requestSchema = mongoose.Schema({
  rideID: mongoose.Types.ObjectId,
  senderID: String,
  recepientID: String,
  status: {
    type: String,
    default: "pending"
  },
  archived: {
    type: Boolean,
    default: false
  },
  reminders: {
    type: Number,
    default: 1
  },
  luggage: Number,
  msg: String,
  date: Date
});

const Request = mongoose.model("Request", requestSchema);

module.exports = { Request: Request };
