const mongoose = require("mongoose");

const requestSchema = mongoose.Schema({
  rideID: mongoose.Types.ObjectId,
  senderID: String,
  recepientID: String,
  status: {
    type: String,
    default: "pending"
  },
  msg: String,
  date: Date
});

const Request = mongoose.model("Request", requestSchema);

module.exports = { Request: Request };
