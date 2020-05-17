const mongoose = require("mongoose");

const rideSchema = mongoose.Schema({
  ownerUsername: String,
  from: String,
  to: String,
  date: Date,
  price: String,
  seats: Number,
  detail: String,
  passengers: Array,
  instantBook: {
    enabled: {
      type: Boolean,
      default: false,
    },
    specificPickUpDropOff: {
      type: Boolean,
      default: true,
    },
    smokingAllowed: {
      type: Boolean,
      default: false,
    },
    noPetsAllowed: {
      type: Boolean,
      default: false,
    },
    singleCarryOn: {
      type: Boolean,
      default: false,
    },
    singleLuggage: {
      type: Boolean,
      default: false,
    },
  },
});

const Ride = mongoose.model("Ride", rideSchema);

module.exports = { Ride: Ride };
