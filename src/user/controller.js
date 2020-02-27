const User = require("./user").User;
const Ride = require("../ride/ride.js").Ride;
const Noti = require("../noti/noti.js").Noti;
const Review = require('../review/review').Review; 

// Users require a certain minimum amount of ratings to calculate an average rating 
const MIN_TO_DISPLAY_AVERAGE_RATING = 1

// For email parsing 
const mongoose = require('mongoose')
const dataSchema = new mongoose.Schema({});
const Schools = mongoose.model('Schools', dataSchema, 'schools');
const parseDomain = require("parse-domain");


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

const signup = async (userInfo, schoolEmail, callback) => {
  const newUser = userInfo;
  newUser.email = schoolEmail;
  newUser.school = await parseEmailForSchool(schoolEmail)
  if (!newUser.school) {
    callback('School is not supported yet!', null)
  }

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
  User.findOneAndUpdate({ email }, { verified: true }, {new: true}, (err, result) => {
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

const findUserByEmail = (email, callback) => {
  User.find({ email }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const findUserByUsername = (username, callback) => {
  User.find({ username }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const findUserByPhoneNumber = (phoneNumber, callback) => {
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
  findUserByUsername(username, (err, result) => {
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

const updateUser = (authUsername, updates, callback) => {
  User.findOneAndUpdate(
    { username: authUsername },
    updates,
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
    } else {
      callback(null, result);
    }
  });
};

const passwordReset = (authUsername, newPassword, callback) => {
  User.findOneAndUpdate(
    { username: authUsername },
    { password: newPassword }, 
    {new: true}, 
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  );
};

const updateAboutMe = (authUsername, updatedAboutMe) => {
  return new Promise((resolve, reject) => {
    User.findOneAndUpdate({username: authUsername}, {aboutMe:updatedAboutMe}, {new: true}).then((updatedUser) => {
      if (!updatedUser) {
        reject('Could not find user in database when updating about me.') 
      }
      resolve(updatedUser)
    }).catch((e) => {
      reject(e)
    })
  })
}

// Helper function that parses school emails to identify the school the user attends 
const parseEmailForSchool = (schoolEmail) => {
  return new Promise((resolve, reject) => {
    emailDomain = parseDomain(schoolEmail)
    if (!emailDomain) {
      reject("Could not parse email for school") 
    }
    
    Schools.findOne({emailDomain: emailDomain.domain}, (err, result) => {
      if (!result) {
        return reject("School is not yet approved") 
      }
      resolve(result._doc.school)
    }) 
  })
}
// Get the average rating of a user, aggregated from all reviews received by the user 
const getAverageRating = (username) => {
  return new Promise(async (resolve, reject) => {
    try {
      await User.findOne({username}, (err, user) => {
        if (!user) {
          return reject("User does not exist in the database") 
        }
        const {sumOfAllRatings, totalRatings} = user.rating 

        // minimum is set to 1 (at least for now)
        if (totalRatings >= MIN_TO_DISPLAY_AVERAGE_RATING) {
          const averageRating = (sumOfAllRatings/totalRatings).toFixed(2)
          resolve(averageRating)
        }
        else {
          return reject("User must have at least " + MIN_TO_DISPLAY_AVERAGE_RATING + " rating(s) to display an average rating!"); 
        }  
      }) 
    }
    catch(e) {
      return reject("Could not retrieve all reviews left for user.")
    }
  })
}; 

module.exports = {
  checkAvailability,
  login,
  verifyEmail,
  getMyInfo,
  findUserByEmail,
  findUserByUsername,
  findUserByPhoneNumber,
  uploadPicUrl,
  getPicType, 
  getPicUrl,
  signup,
  updateUser,
  deleteUser,
  confirmCredentials,
  passwordReset, 
  updateAboutMe,
  parseEmailForSchool, 
  getAverageRating, 
};
