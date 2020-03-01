const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  // Account information 
  name: String, 
  email: String,
  username: {type: String, index: true},
  password: String,
  phoneNumber: String,
  picUrl: String,
  picType: {type: String, default: "png"},
  verified: {type: Boolean, default: false},
  createdAt: {type: Date, default: new Date()}, 

  // Personal information  
  aboutMe: String, 
  school: String,
  cancelledRides: { type: Number, default: 0 }, 
  rating: {
    sumOfAllRatings: { type: Number, default: 0 }, 
    totalRatings: { type: Number, default: 0 }, 
  }
});

userSchema.statics.setRandomBruinBear = function(username) {
  const colors = ["blue", "orange", "pink", "purple", "white"];
  const default_picUrl =
    "https://poolup-bucket-deployment.s3.us-east-2.amazonaws.com/DefaultProfilePic/PoolUpLogo_" +
    colors[Math.floor(Math.random() * colors.length)] +
    ".png";
  return this.findOneAndUpdate(
    { username },
    { picUrl: default_picUrl },
    function(error, result) {
      if (error) {
        throw new Error();
      }
    }
  );
};

userSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 30, partialFilterExpression: { verified: false } }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
