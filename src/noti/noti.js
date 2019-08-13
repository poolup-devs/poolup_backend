const mongoose = require("mongoose");

const notiSchema = mongoose.Schema({
  username: String,
  msg: String,
  passengerPhoneNumber: String,
  passengerEmail: String,
  viewed: {
    type: Boolean,
    default: false
  },
  date: Date
});

const Noti = mongoose.model("Noti", notiSchema);

module.exports = { Noti: Noti };
