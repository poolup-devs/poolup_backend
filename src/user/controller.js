const User = require("./user").User;

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

const checkAvailability = (email, username, phoneNumber, callback) => {
  User.find({ email, username, phoneNumber }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const signup = (userInfo, callback) => {
  const newUser = userInfo;
  newUser.posting_list = [];
  newUser.participate = [];
  User.create(newUser, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const verifyEmail = (email, callback) => {
  User.findOneAndUpdate({ email }, { verified: true }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
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
  User.findOneAndUpdate({ username }, { picUrl, picType }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
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

module.exports = {
  checkAvailability,
  login,
  verifyEmail,
  emailValidation,
  usernameValidation,
  phoneNumberValidation,
  getPicType,
  uploadPicUrl,
  getPicUrl,
  signup
};
