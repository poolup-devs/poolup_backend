const mongoose = require("mongoose");

const rideSchema = mongoose.Schema({
  ownerEmail: { type: String, required: true },
  ownerUsername: { type: String, required: true },
  // ownerPhoneNumber: { type: String, required: true },
  ownerPhoneNumber: String,
  from: { type: String, required: true },
  to: { type: String, required: true },
  date: { type: Date, default: new Date() },
  price: { type: String, required: true },
  seats: { type: Number, required: true },
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
