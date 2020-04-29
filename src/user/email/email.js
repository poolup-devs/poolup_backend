const mongoose = require("mongoose");

const emailSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  remainingResendAmount: {
    type: Number,
    default: 10,
  },
  status: {
    type: String,
    enum: ["pre-verification", "pre-registration", "registered"],
    default: "pre-verification",
  },
});

emailSchema.index({ email: 1 }, { unique: true });

const Email = mongoose.model("Email", emailSchema);

module.exports = { Email };
