const Transfer = require("./transfer.js").Transfer;
const Error = require("../../utils/error-model");

// createTransfer: creates a new transfer object
const createTransfer = (transferInfo) => {
  return new Promise(async (resolve, reject) => {
    try {
      const newTransfer = await new Transfer(transferInfo).save();
      return resolve(newTransfer);
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

// checkExpired: triggers transfer if scheduled transfer has expired
const checkExpired = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const transfers = await Transfer.find({
        targetDate: { $lt: new Date() },
        status: "scheduled",
        expired: false,
      });

      if (transfers.length === 0) {
        return resolve(transfers);
      }

      transfers.forEach((transfer) => {
        transfer.expired = true;
        transfer.save();
      });

      return resolve(transfers);
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

// updateTransferStatus: sets the status of a transfer to a new status
const updateTransferStatus = (transferID, newStatus) => {
  return new Promise(async (resolve, reject) => {
    try {
      const filter = { _id: transferID };
      const update = { $set: { status: newStatus } };
      const options = { new: true };

      // Validate Transfer
      const transferDetails = await Transfer.findOne(filter);

      switch (transferDetails.status) {
        case "scheduled": {
          break;
        }
        case "blocked": {
          if (newStatus === "completed") {
            throw "Transfer needs to be in a 'scheduled' status before being able to refund or complete";
          }
          break;
        }
        case "refunded": {
          throw "Transfer cannot be changed after refunded.";
          break;
        }
        case "completed": {
          throw "Transfer cannot be changed after completion.";
          break;
        }
        default: {
          errFlag = 400;
          throw "Invalid Status to Update";
        }
      }

      // Update Status
      const res = await Transfer.findOneAndUpdate(filter, update, options);
      return resolve(res);
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

module.exports = {
  checkExpired,
  createTransfer,
  updateTransferStatus,
};
