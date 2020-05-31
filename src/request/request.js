const mongoose = require("mongoose");

const requestSchema = mongoose.Schema({
  rideID: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  requesterUsername: {
    type: String,
    required: true,
  },
  requesteeUsername: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "denied", "cancelled"],
    default: "pending",
  },
  archived: {
    type: Boolean,
    default: false,
  },
  reminders: {
    type: Number,
    default: 1,
  },
  carryOn: {
    type: Number,
    default: 0,
  },
  luggage: {
    type: Number,
    default: 0,
  },
  msg: String,
  date: {
    type: Date,
    default: Date.now(),
  },
});

const Request = mongoose.model("Request", requestSchema);

module.exports = { Request: Request };
