const User = require("./user.js").User;
const Ride = require("../ride/ride.js").Ride;
const Noti = require("../noti/noti.js").Noti;
const Email = require("./email/email").Email;
const jwt = require("jsonwebtoken");

const EmailUtil = require("../utils/email/email");
const Error = require("../utils/error-model");
const School = require("../school/school.js").School;

// Users require a certain minimum amount of ratings to calculate an average rating
const MIN_TO_DISPLAY_AVERAGE_RATING = 1;

const mongoose = require("mongoose");
const dataSchema = new mongoose.Schema({});
const parseDomain = require("parse-domain");
const sha256 = require("sha256");

const isValidEmailToRegister = require("./email/utils").isValidEmailToRegister;

const login = async (email, password) => {
  return new Promise(async (resolve, reject) => {
    const user = await User.findOne({ email, password });
    if (!user) {
      return reject(Error(401, "User with email and password not found."));
    }
    return resolve(user);
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
      return reject(Error(400, "Not all required fields were specified."));
    }
    try {
      const v = await isValidEmailToRegister(userInfo.email);
      switch (v) {
        case "email can be registered":
          break;
        case "email not verified":
          return reject(Error(403, "Email not verified"));
        case "email already registered":
          return reject(Error(403, "Email already registered"));
        default:
          return reject(Error(500));
      }

      // Create a user document containing a hashed password with username and school fields parsed from email
      userInfo.password = sha256(userInfo.password);
      userInfo.school = await parseSchoolFromEmail(userInfo.email);
      userInfo.username = userInfo.email.split("@")[0];
      userInfo.isRegistered = true;
      const newUser = await User.create(userInfo);
      User.setRandomBruinBear(newUser.username);
      await Email.updateOne(
        { email: userInfo.email },
        { status: "registered" }
      );

      // Give the user a stripe id
      var stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

      // Create Customer ID
      stripe.customers.create(
        {
          email: newUser.email,
          name: newUser.firstName + " " + newUser.lastName,
        },
        function (err, customer) {
          // asynchronously called
          if (err) {
            // console.log("Failed to create Stripe Customer: ", err);
          } else {
            newUser.stripe.customerID = customer.id;
            return resolve(newUser);
          }
          return resolve(newUser);
        }
      );
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

const findUserByUsername = (username) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userInfo = await User.findOne({ username });
      return resolve(userInfo);
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

// const findUserByPhoneNumber = (phoneNumber, callback) => {
//   User.find({ phoneNumber }, (err, result) => {
//     if (err) {
//       callback(Error(500,err), null);
//     } else {
//       callback(null, result);
//     }
//   });
// };

const findUserByEmail = (email, callback) => {
  User.find({ email }, (err, result) => {
    if (err) {
      callback(Error(500, err), null);
    } else {
      callback(null, result);
    }
  });
};

// const getMyInfo = (authUsername, callback) => {
//   User.findOne({ username: authUsername }, (err, result) => {
//     if (err) {
//       callback(err, null);
//     } else if (result) {
//       const res_list = [
//         "username",
//         "firstName",
//         "lastName",
//         "email",
//         "createdAt",
//         "picUrl",
//         "stripe",
//       ];
//       const result_ = {};

//       res_list.forEach(function (item) {
//         result_[item] = result[item];
//       });

//       callback(null, result_);
//     } else {
//       callback(
//         {
//           message: "ERROR: username not found",
//         },
//         null
//       );
//     }
//   });
// };

const getPicType = (username, callback) => {
  User.findOne({ username }, (err, result) => {
    if (err) {
      callback(Error(500, err), null);
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
        callback(Error(500, err), null);
      } else {
        callback(null, result);
      }
    }
  );
};

const getPicUrl = (username) => {
  return new Promise(async (resolve, reject) => {
    const userInfo = await findUserByUsername(username);
    if (!userInfo) {
      return reject(Error(404, "username not found"));
    } else if (userInfo.picUrl === undefined) {
      return reject(Error(500, "user's profile picture undefined"));
    }

    return resolve(userInfo.picUrl);
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
          return reject(Error(500, err));
        }

        // If username not found
        if (!result) {
          return reject(Error(404, "user of username not found"));
          return;
        }

        if (result.driver.isDriver) {
          return resolve(true);
        } else {
          return resolve(false);
        }
      }
    );
  });
};

const addUserDriverInfo = (driverInfo) => {
  return new Promise(async (resolve, reject) => {
    await User.findOneAndUpdate(
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
          return reject(Error(500, err));
        } else {
          return resolve(result);
        }
      }
    );
  });
};

const updateUser = (authUsername, updates, callback) => {
  User.findOneAndUpdate(
    { username: authUsername },
    updates,
    { new: true },
    (err, result) => {
      if (err) {
        callback(Error(500, err), null);
      } else {
        callback(null, result);
      }
    }
  );
};

// const deleteUser = (authUsername, callback) => {
//   //have to delete prof. pic in s3 TOO!!//
//   User.deleteOne({ username: authUsername }, (err, result) => {
//     if (err) {
//       callback(err, null);
//     } else {
//       Ride.deleteMany({ ownerUsername: authUsername }, (err, result) => {
//         if (err) {
//           callback(err, null);
//         } else {
//           Noti.deleteMany({ username: authUsername }, (err, result) => {
//             if (err) {
//               callback(err, null);
//             } else {
//               callback(null, null);
//             }
//           });
//         }
//       });
//     }
//   });
// };

const isValidPassword = (password) => {
  return new Promise(async (resolve, reject) => {
    // Password must be a minimum of 8 characters long
    if (password.length < 8) {
      return reject(Error(400, "Password must be at least 8 characters long!"));
    }
    return resolve(true);
  });
};

// const isValidEmail = (email) => {
//   return new Promise(async (resolve, reject) => {
//     // Validate email address
//     if (isEmail.validate(email)) {
//       // Must be student email
//       const emailDomain = parseDomain(email);

//       if (!emailDomain || emailDomain.tld !== "edu") {
//         return reject("Not an .edu email address!");
//       }
//       // A registered account exists with this email
//       if (await User.findOne({ email: email.trim(), isRegistered: true })) {
//         return reject("A registered account already exists with this email!");
//       }
//       return resolve(true);
//     } else {
//       return reject("Not a valid email address!");
//     }
//   });
// };

const confirmCredentials = (authUsername, password) => {
  return new Promise(async (resolve, reject) => {
    try {
      const user = await User.findOne({ username: authUsername, password });
      if (!user) {
        return reject(Error(401, "incorrect password"));
      }
      return resolve(user);
    } catch (err) {
      return reject(Error(500, err));
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
        callback(Error(500, err), null);
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
        return reject(
          Error(404, "There does not exist a user with this username.")
        );
      }
      return resolve(user.aboutMe);
    } catch (err) {
      return reject(Error(500, err));
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
          return reject(
            Error(
              404,
              "Could not find user in database when updating about me."
            )
          );
        }
        return resolve(updatedUser);
      })
      .catch((err) => {
        return reject(Error(500, err));
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
    School.findOne({ emailDomain: emailDomain.domain }, (err, result) => {
      if (!result) {
        // Domain -> School not found in database, so set to null until we can add it later
        return resolve(null);
      }
      return resolve(result._doc.school);
    });
  });
};

// Get the average rating of a user, aggregated from all reviews received by the user
const getAverageRating = (username) => {
  return new Promise(async (resolve, reject) => {
    try {
      await User.findOne({ username }, (err, user) => {
        if (!user) {
          return reject(Error(404, "User does not exist in the database"));
        }
        const { sumOfAllRatings, totalRatings } = user.rating;

        // minimum is set to 1 (at least for now)
        if (totalRatings >= MIN_TO_DISPLAY_AVERAGE_RATING) {
          const averageRating = (sumOfAllRatings / totalRatings).toFixed(2);
          return resolve(averageRating);
        } else {
          return reject(
            Error(
              400,
              "User must have at least " +
                MIN_TO_DISPLAY_AVERAGE_RATING +
                " rating(s) to display an average rating!"
            )
          );
        }
      });
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

// Get public profile information
const getPublicProfileInfo = (username) => {
  return new Promise(async (resolve, reject) => {
    const user = await User.findOne({ username });
    if (!user) {
      return reject(Error(404, "User could not be found!"));
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
      return resolve({
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
    return resolve({
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
      return reject(Error(404, "User could not be found!"));
    }
    return resolve(user.school);
  });
};

module.exports = {
  login,
  findUserByEmail,
  findUserByUsername,
  // findUserByPhoneNumber,
  // getMyInfo,
  uploadPicUrl,
  getPicType,
  getPicUrl,
  signup,
  checkIfDriver,
  addUserDriverInfo,
  updateUser,
  // deleteUser,
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
