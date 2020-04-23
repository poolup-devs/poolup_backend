const mongoose = require("mongoose");

const emailToVerifySchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  remainingResendAmt: {
    type: Number,
    default: 10,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  verified: {
    type: Boolean,
    default: false,
  },
});
const EmailToVerify = mongoose.model("VerifyingEmail", emailToVerifySchema);

module.exports = { EmailToVerify };
