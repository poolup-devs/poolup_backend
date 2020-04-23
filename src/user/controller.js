const User = require("./user").User;
const Ride = require("../ride/ride.js").Ride;
const Noti = require("../noti/noti.js").Noti;
const EmailToVerify = require("./emailToVerify/emailToVerify.js").EmailToVerify;
const jwt = require("jsonwebtoken");
const Email = require("../utils/email/email");
const Error = require("../utils/error-model");

// Users require a certain minimum amount of ratings to calculate an average rating
const MIN_TO_DISPLAY_AVERAGE_RATING = 1;

const mongoose = require("mongoose");
const dataSchema = new mongoose.Schema({});
const Schools = mongoose.model("Schools", dataSchema, "schools");
// const parseDomain = require("parse-domain");
// const isEmail = require("isemail");
const sha256 = require("sha256");

const login = async (email, password) => {
  return new Promise(async (resolve, reject) => {
    const user = await User.findOne({ email, password });
    if (!user) {
      return reject("User with email and password not found.");
    }
    return resolve(user);
  });
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

const signup = async (userInfo) => {
  return new Promise(async (resolve, reject) => {
    // Required properties
    const requiredProperties = ["firstName", "lastName", "password", "email"];
    // Field validation
    if (
      !requiredProperties.every((property) => userInfo.hasOwnProperty(property))
    ) {
      return reject("Not all required fields were specified.");
    }
    try {
      const verifiedEmail = await EmailToVerify.find({ email: userInfo.email });
      if (verifiedEmail == null) {
        return reject(Error(400, "Email has not initiated verification"));
      }
      if (verifiedEmail.verified === false) {
        return reject(
          Error(
            400,
            "Verification email was sent, but email has not been verified"
          )
        );
      }

      // Create a user document containing a hashed password with username and school fields parsed from email
      userInfo.password = sha256(userInfo.password);
      userInfo.school = await parseSchoolFromEmail(userInfo.email);
      userInfo.username = userInfo.email.split("@")[0];

      const newlyRegisteredUser = await User.create(userInfo, { new: true });
      User.setRandomBruinBear(newlyRegisteredUser.username);

      // Give the user a stripe id
      var stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

      // Create Customer ID
      stripe.customers.create(
        {
          email: newlyRegisteredUser.email,
          name:
            newlyRegisteredUser.firstName + " " + newlyRegisteredUser.lastName,
        },
        function (err, customer) {
          // asynchronously called
          if (err) {
            console.log("Failed to create Stripe Customer: ", err);
          } else {
            newlyRegisteredUser.stripe.customerID = customer.id;
            resolve(newlyRegisteredUser);
          }
        }
      );
    } catch (err) {
      return reject(Error(500, err));
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
      const res_list = [
        "username",
        "firstName",
        "lastName",
        "email",
        "createdAt",
        "picUrl",
      ];
      const result_ = {};

      res_list.forEach(function (item) {
        result_[item] = result[item];
      });

      callback(null, result_);
    } else {
      callback(
        {
          message: "ERROR: username not found",
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
          message: "ERROR: no result; potentially wrong username",
        },
        null
      );
    } else if (result[0].picUrl === undefined) {
      callback(
        {
          message: "ERROR: user's profile picture undefined",
        },
        null
      );
    } else {
      callback(null, result[0].picUrl);
    }
  });
};

const checkIfDriver = (username) => {
  return new Promise(async (resolve, reject) => {
    User.findOne(
      {
        username: username,
      },
      (err, result) => {
        if (err) {
          reject(err);
        }

        // If username not found
        if (!result) {
          reject(new Error("User not found"));
          return;
        }

        if (result.driver.isDriver) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    );
  });
};

const addUserDriverInfo = (driverInfo, callback) => {
  User.findOneAndUpdate(
    { username: driverInfo.username },
    {
      stripe: {
        accountID: driverInfo.stripeAccountID,
      },
      driver: {
        isDriver: true,
        licensePlate: driverInfo.licensePlate,
        vehicleMakeModel: driverInfo.vehicleMakeModel,
        driversLicense: driverInfo.driversLicense,
        vehicleColor: driverInfo.vehicleColor,
      },
      phoneNumber: driverInfo.phoneNumber,
    },
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

const isValidPassword = (password) => {
  return new Promise(async (resolve, reject) => {
    // Password must be a minimum of 8 characters long
    if (password.length < 8) {
      return reject("Password must be at least 8 characters long!");
    }
    return resolve(true);
  });
};

const confirmCredentials = (authUsername, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ username: authUsername, password });
      if (!user) {
        return resolve(null);
      }
      return resolve(user);
    } catch (e) {
      reject(e);
    }
  });
};

const passwordReset = (authUsername, newPassword, callback) => {
  User.findOneAndUpdate(
    { username: authUsername },
    { password: newPassword },
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

const getAboutMe = (username) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        reject("There does not exist a user with this username.");
      }
      resolve(user.aboutMe);
    } catch (e) {
      reject(e);
    }
  });
};

const updateAboutMe = (authUsername, updatedAboutMe) => {
  return new Promise((resolve, reject) => {
    User.findOneAndUpdate(
      { username: authUsername },
      { aboutMe: updatedAboutMe },
      { new: true }
    )
      .then((updatedUser) => {
        if (!updatedUser) {
          reject("Could not find user in database when updating about me.");
        }
        resolve(updatedUser);
      })
      .catch((e) => {
        reject(e);
      });
  });
};

// Helper function that parses school emails to identify the school the user attends
const parseSchoolFromEmail = (schoolEmail) => {
  return new Promise((resolve, reject) => {
    emailDomain = parseDomain(schoolEmail);
    if (!emailDomain) {
      reject("Could not parse email to identify school");
    }
    Schools.findOne({ emailDomain: emailDomain.domain }, (err, result) => {
      if (!result) {
        // Domain -> School not found in database, so set to null until we can add it later
        return resolve(null);
      }
      resolve(result._doc.school);
    });
  });
};

// Get the average rating of a user, aggregated from all reviews received by the user
const getAverageRating = (username) => {
  return new Promise(async (resolve, reject) => {
    try {
      await User.findOne({ username }, (err, user) => {
        if (!user) {
          return reject("User does not exist in the database");
        }
        const { sumOfAllRatings, totalRatings } = user.rating;

        // minimum is set to 1 (at least for now)
        if (totalRatings >= MIN_TO_DISPLAY_AVERAGE_RATING) {
          const averageRating = (sumOfAllRatings / totalRatings).toFixed(2);
          resolve(averageRating);
        } else {
          return reject(
            "User must have at least " +
              MIN_TO_DISPLAY_AVERAGE_RATING +
              " rating(s) to display an average rating!"
          );
        }
      });
    } catch (e) {
      return reject("Could not retrieve all reviews left for user.");
    }
  });
};

// Get public profile information
const getPublicProfileInfo = (username) => {
  return new Promise(async (resolve, reject) => {
    const user = await User.findOne({ username });
    if (!user) {
      reject("User could not be found!");
    }
    const {
      firstName,
      lastName,
      picUrl,
      picType,
      aboutMe,
      school,
      ridesCancelled,
      ridesCompleted,
    } = user;
    try {
      var rating = await getAverageRating(username);
    } catch (e) {
      // Ommit rating if it cannot be calculated due to not having any reviews
      resolve({
        firstName,
        lastName,
        picUrl,
        picType,
        school,
        ridesCompleted,
        ridesCancelled,
        aboutMe,
      });
    }
    resolve({
      firstName,
      lastName,
      picUrl,
      picType,
      school,
      rating,
      ridesCompleted,
      ridesCancelled,
      aboutMe,
    });
  });
};

// Get school name
const getSchool = (username) => {
  return new Promise(async (resolve, reject) => {
    const user = await User.findOne({ username });
    if (!user) {
      reject("User could not be found!");
    }
    resolve(user.school);
  });
};

module.exports = {
  checkAvailability,
  login,
  findUserByEmail,
  findUserByUsername,
  findUserByPhoneNumber,
  getMyInfo,
  uploadPicUrl,
  getPicType,
  getPicUrl,
  signup,
  checkIfDriver,
  addUserDriverInfo,
  updateUser,
  deleteUser,
  isValidPassword,
  passwordReset,
  getAboutMe,
  updateAboutMe,
  getAverageRating,
  getPublicProfileInfo,
  parseSchoolFromEmail,
  confirmCredentials,
  getSchool,
};
