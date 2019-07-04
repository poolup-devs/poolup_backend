const mongoose = require("mongoose");

const rideSchema = mongoose.Schema({
  ownerEmail: String,
  ownerUsername: String,
  ownerPhoneNumber: String,
  from: String,
  to: String,
  date: Date,
  price: String,
  seats: Number,
  detail: String,
  passengers: Array
});

const Ride = mongoose.model("Ride", rideSchema);

module.exports = { Ride: Ride };
