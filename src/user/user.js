const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: String,
  email: String,
  username: String,
  password: String,
  phoneNumber: String,
  picUrl: String,
  picType: {
    type: String,
    default: "png"
  },
  verified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: new Date()
  }, 
  rating: {
    totalCount: {
      type: Number,
      default: 0 
    }, 
    totalValue: {
      type: Number, 
      default: 0 
    }, 
    average: Number
  }
});

userSchema.methods.addRating = function (newRating) {
   return new Promise((resolve, reject) => {
    if (newRating < 0 || newRating > 5) {
      return reject("The rating must be a value from 1 to 5!")
    }
    const userRating = this.rating
    userRating.totalValue += newRating 
    userRating.average = userRating.totalValue / ++userRating.totalCount 
    resolve(this.rating)
   })
}

userSchema.statics.setRandomBruinBear = function(username) {
  const colors = ["blue", "orange", "pink", "purple", "white"];
  const default_picUrl =
    "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_" +
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
