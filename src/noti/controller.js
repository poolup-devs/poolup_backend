const Noti = require("./noti").Noti;

const getNoti = (email, callback) => {
  Noti.find({ email }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  })
    .sort({ _id: -1 })
    .limit(8);
};

const updateNoti = (email, callback) => {
  Noti.updateMany({ email }, { $set: { viewed: true } }, (err, result) => {
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
  updateNoti
};
