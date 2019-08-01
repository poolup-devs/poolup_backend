const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  email: String,
  username: String,
  password: String,
  phoneNumber: String,
  driverList: Array,
  riderList: Array,
  picUrl: String
});

const User = mongoose.model("User", userSchema);

module.exports = { User: User };
