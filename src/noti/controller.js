const Noti = require("./noti").Noti;

const getUnviewedNoti = async (username) => {
  return new Promise( async (resolve, reject) => {
    try {
      const res = await Noti.find({ username, viewed: false }).sort({date: -1});
      return resolve(res);
    } catch(err) {
      return reject(err)
    }
  })
  // Noti.find({ username, viewed: false }, (err, result) => {
  //   if (err) {
  //     callback(err, null);
  //   } else {
  //     callback(null, result);
  //   }
  // })
  //   .sort({ _id: -1 })
  //   .limit(8);
};

const updateNoti = async (notiInfo) => {
  return new Promise( async (resolve, reject) => {
    try {
      const res = await Noti.findByIdAndUpdate(
        { _id: notiInfo._id },
        { $set: { viewed: true, viewedAt: new Date() }}
      );

      return resolve(res);
    } catch (err) {
      return reject(err);
    }
  });
  // Noti.updateMany(
  //   { username },
  //   { $set: { viewed: true, viewedAt: new Date() } },
  //   (err, result) => {
  //     if (err) {
  //       callback(err, null);
  //     } else {
  //       callback(null, result);
  //     }
  //   }
  // )
  //   .sort({ _id: -1 })
  //   .limit(8);
};

module.exports = {
  getUnviewedNoti,
  updateNoti
};
