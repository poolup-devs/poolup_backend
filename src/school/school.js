const mongoose = require("mongoose");

const schoolSchema = mongoose.Schema({
  emailDomain: String,
  school: String,
});

const School = mongoose.model("School", schoolSchema);

module.exports = { School: School };
