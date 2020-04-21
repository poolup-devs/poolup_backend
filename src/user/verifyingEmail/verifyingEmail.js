const mongoose = require("mongoose");

const verifyingEmailSchema = mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
});
const VerifyingEmail = mongoose.model("VerifyingEmail", verifyingEmailSchema);

module.exports = { VerifyingEmail };
