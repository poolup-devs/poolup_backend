const mongoose = require("mongoose");

const intentBetaSchema = mongoose.Schema({
  targetDate: Date,
  rideID: String,
  ownerUsername: String,
  customerUsername: String,
  expired: {
      type: Boolean,
      default: false
  },
  date: Date
});

const IntentBeta = mongoose.model("IntenetBeta", intentBetaSchema);

module.exports = { IntentBeta };
