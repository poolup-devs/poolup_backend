const mongoose = require("mongoose");
const notiSchema = mongoose.Schema({
  username: String,
  msg: String,
  viewed: { type: Boolean, default: false },
  viewedAt: Date,
  date: { type: Date, default: Date.now() }, 
  redirectPath: String, 
  // Used for properties specific to the notification, such as the 'reason for cancellation' in cancellation-type notifications  
  additionalProperties: mongoose.Schema.Types.Mixed, 
});

notiSchema.index({ viewedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const Noti = mongoose.model("Noti", notiSchema);

module.exports = { Noti: Noti };
