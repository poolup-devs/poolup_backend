const Noti = require("./noti").Noti;

const getNoti = (username, callback) => {
  Noti.find({ username, viewed: false }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  })
    .sort({ _id: -1 })
    .limit(8);
};

const createNoti = (notiInfo, callback) => {
  Noti.create(notiInfo, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const updateNoti = (username, callback) => {
  Noti.updateMany({ username }, { $set: { viewed: true } }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  })
    .sort({ _id: -1 })
    .limit(8);
};

module.exports = {
  getNoti,
  createNoti,
  updateNoti
};
