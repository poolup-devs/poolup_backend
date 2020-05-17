const Noti = require("./noti").Noti;

const ControllerException = require("../utils/errors/controllerException");

const getAllUserNoti = async (username, pageNum) => {
  const pageLimit = 10;
  return new Promise(async (resolve, reject) => {
    try {
      const res = await Noti.find({ username })
        .sort({ date: -1 })
        .skip((Number(pageNum) - 1) * pageLimit)
        .limit(pageLimit);
      return resolve(res);
    } catch (err) {
      return reject(err);
    }
  });
};

const viewNoti = async (notiInfo) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await Noti.findByIdAndUpdate(
        { _id: notiInfo._id },
        { $set: { viewed: true, viewedAt: new Date() } },
        { new: true }
      );

      return resolve(res);
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  getAllUserNoti,
  viewNoti,
};
