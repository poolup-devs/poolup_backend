const User = require("./user").User;

const uploadPicUrl = (_id, picUrl, callback) => {
  User.findOneAndUpdate({ _id }, { picUrl }, (err, result) => {
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

const checkAvailability = (email, username, phoneNumber, callback) => {
  User.find({ email, username, phoneNumber }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const login = (email, password, callback) => {
  User.findOne(
    {
      email: email,
      password: password
    },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  );
};

const post = (userInfo, callback) => {
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

module.exports = {
  checkAvailability,
  login,
  emailValidation,
  usernameValidation,
  phoneNumberValidation,
  uploadPicUrl,
  getPicUrl,
  post
};
