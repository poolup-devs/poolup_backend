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

//notiSchema.index({createdAt: 1}, {expiresAfterSeconds: 60*60*24*7, partialFilterExpression:{viewed: true}});

const Noti = mongoose.model("Noti", notiSchema);

module.exports = { Noti: Noti };
