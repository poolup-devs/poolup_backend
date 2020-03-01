const mongoose = require("mongoose");

const notiSchema = mongoose.Schema({
  username: String,
  msg: String,
  senderPhoneNumber: String,
  senderEmail: String,
  viewed: {
    type: Boolean,
    default: false
  },
  viewedAt: Date,
  date: Date
});

notiSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const Noti = mongoose.model("Noti", notiSchema);

module.exports = { Noti: Noti };
