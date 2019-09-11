const User = require("./user").User;
const Ride = require("../ride/ride.js").Ride;
const Noti = require("../noti/noti.js").Noti;

// Users require a certain minimum amount of ratings to calculate an average rating 
const MIN_TO_DISPLAY_AVERAGE_RATING = 3 


const login = (email, password, callback) => {
  User.findOne(
    {
      email: email,
      password: password
    },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else if (result === null) {
        callback({ message: "user with email and password not found" }, null);
      } else if (result.verified === false) {
        callback({ message: "email not verified" }, null);
      } else {
        callback(null, result);
      }
    }
  );
};

const checkAvailability = (email, username, callback) => {
  User.find({ email, username }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const signup = (userInfo, ucla_email, callback) => {
  const newUser = userInfo;
  newUser.email = ucla_email;
  User.create(newUser, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      try {
        User.setRandomBruinBear(newUser.username);
      } catch (e) {
        callback(e, null);
      }
      callback(null, result);
    }
  });
};

const verifyEmail = (email, callback) => {
  User.findOneAndUpdate({ email }, { verified: true }, (err, result) => {
    if (err) {
      callback(err, null);
    } else if (result) {
      callback(null, result);
    } else {
      callback(
        {
          message: "ERROR: verification token expired; try signing up again"
        },
        null
      );
    }
  });
};

const emailValidation = (email, callback) => {
  User.find({ email }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const usernameValidation = (username, callback) => {
  User.find({ username }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const phoneNumberValidation = (phoneNumber, callback) => {
  User.find({ phoneNumber }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const getMyInfo = (authUsername, callback) => {
  User.findOne({ username: authUsername }, (err, result) => {
    if (err) {
      callback(err, null);
    } else if (result) {
      const res_list = ["username", "name", "email", "createdAt", "picUrl"];
      const result_ = {};

      res_list.forEach(function(item) {
        console.log(item);
        result_[item] = result[item];
      });

      callback(null, result_);
    } else {
      callback(
        {
          message: "ERROR: username not found"
        },
        null
      );
    }
  });
};

const getPicType = (username, callback) => {
  User.findOne({ username }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const uploadPicUrl = (username, picUrl, picType, callback) => {
  User.findOneAndUpdate(
    { username },
    { picUrl, picType },
    { new: true },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  );
};

const getPicUrl = (username, callback) => {
  User.find({ username }, (err, result) => {
    if (err) {
      callback(err, null);
    } else if (result.length === 0) {
      callback(
        {
          message: "ERROR: no result; potentially wrong username"
        },
        null
      );
    } else if (result[0].picUrl === undefined) {
      callback(
        {
          message: "ERROR: user's profile picture undefined"
        },
        null
      );
    } else {
      callback(null, result[0].picUrl);
    }
  });
};

const updateUser = (authUsername, name, phoneNumber, callback) => {
  User.findOneAndUpdate(
    { username: authUsername },
    { name, phoneNumber },
    { new: true },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  );
};

const deleteUser = (authUsername, callback) => {
  //have to delete prof. pic in s3 TOO!!//
  User.deleteOne({ username: authUsername }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      Ride.deleteMany({ ownerUsername: authUsername }, (err, result) => {
        if (err) {
          callback(err, null);
        } else {
          Noti.deleteMany({ username: authUsername }, (err, result) => {
            if (err) {
              callback(err, null);
            } else {
              callback(null, null);
            }
          });
        }
      });
    }
  });
};

const confirmCredentials = (authUsername, password, callback) => {
  User.findOne({ username: authUsername, password }, (err, result) => {
    if (err) {
      callback(err, null);
    } else if (result.length === 0) {
      callback(null, null);
    } else {
      callback(null, result);
    }
  });
};

const passwordReset = (authUsername, newPassword, callback) => {
  User.findOneAndUpdate(
    { username: authUsername },
    { password: newPassword },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  );
};

const addNewRating = async (userId, newRating) => {
  if (newRating < 1|| newRating > 5) {
      return Promise.reject("The rating must be a value from 1 to 5.")
  }
  try {
      const {rating} = await User.findById({_id: userId})
      const averageRating = ((rating.totalValue + newRating) / (rating.totalCount + 1)).toFixed(2)
      const user = await User.findByIdAndUpdate(
          {_id: userId}, 
          {
            $inc: {'rating.totalValue': newRating, 'rating.totalCount': 1},
            $set: {'rating.averageRating': averageRating}             
          }, 
          {new: true, useFindAndModify: false}
      )
      return Promise.resolve(user.rating)
  }
  catch(e) {
      return Promise.reject(e, "Could not add a new rating to the user")
  }
}

const getAverageRating = async (userId) => {
  try {
      const {rating} = await User.findById({_id: userId}) 
      if (rating.totalCount < MIN_TO_DISPLAY_AVERAGE_RATING) {
        return Promise.reject("User must have at least " + MIN_TO_DISPLAY_AVERAGE_RATING + " ratings to display an average rating!")
      }
      return Promise.resolve({averageRating: rating.averageRating})
  }
  catch(e) {
      return Promise.reject("Could not get average rating of user")
  }
}

module.exports = {
  checkAvailability,
  login,
  verifyEmail,
  getMyInfo,
  emailValidation,
  usernameValidation,
  phoneNumberValidation,
  getPicType,
  uploadPicUrl,
  getPicUrl,
  signup,
  updateUser,
  deleteUser,
  confirmCredentials,
  passwordReset, 
  addNewRating,
  getAverageRating
};
