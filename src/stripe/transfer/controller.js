const Transfer = require("./transfer.js").Transfer;

const createTransfer = (
  targetDate,
  amount,
  rideID,
  destination,
  customerUsername
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const newTransfer = await new Transfer({
        targetDate,
        amount,
        rideID,
        destination,
        customerUsername,
        date: new Date()
      }).save();
      resolve(newTransfer);
    } catch (e) {
      reject();
    }
  });
};

const checkExpired = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await Transfer.find({
        targetDate: { $lt: new Date() },
        expired: false
      }).then(Transfers => {
        if (Transfers.length === 0) {
          resolve(Transfers);
        }
        const res = Transfers;
        res.forEach(transfer => {
          transfer.expired = true;
          transfer.save();
        });
        resolve(res);
      });
    } catch (e) {
      reject();
    }
  });
};

module.exports = {
  checkExpired,
  createTransfer
};
