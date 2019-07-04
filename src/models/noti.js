const mongoose = require("mongoose");

const notiSchema = mongoose.Schema({
  email: String,
  msg: String,
  passengerPhoneNumber: String,
  passengerEmail: String,
  viewed: Boolean
});

const Noti = mongoose.model("Noti", notiSchema);

module.exports = { Noti: Noti };
