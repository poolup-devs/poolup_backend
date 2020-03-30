const Transfer = require("./transfer.js").Transfer;

// createTransfer creates a new transfer object
const createTransfer = transferInfo => {
  return new Promise(async (resolve, reject) => {
    try {
      const newTransfer = await new Transfer(transferInfo).save();
      console.log(newTransfer);
      resolve(newTransfer);
    } catch (e) {
      reject();
    }
  });
};

// checkExpired is used to determine whether to trigger a transfer
// for transfers that are scheduled
const checkExpired = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await Transfer.find({
        targetDate: { $lt: new Date() },
        status: "scheduled",
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

// blockTransfer sets the status of a transfer to "blocked"
const blockTransfer = (transferID, callback) => {
  const filter = { _id: transferID };
  const update = { $set: { status: "blocked" } };
  const options = { new: true };

  // Validate Transfer
  Transfer.findOne(filter, (err, transfer) => {
    if (err) {
      callback(err, null);
      return;
    } else if (transfer.status !== "scheduled") {
      callback("Block Failed: Transfer status is " + transfer.status, null);
      return;
    }
  });

  // Update Status
  Transfer.findOneAndUpdate(filter, update, options, (err, result) => {
    if (err) {
      callback(err, null);
      return;
    } else {
      callback(null, result);
    }
  });
};

// resumeTransfer sets the status of a transfer to back to "scheduled"
const resumeTransfer = (transferID, callback) => {
  const filter = { _id: transferID };
  const update = { $set: { status: "scheduled" } };
  const options = { new: true };

  // Validate Transfer
  Transfer.findOne(filter, (err, transfer) => {
    if (err) {
      callback(err, null);
      return;
    } else if (transfer.status !== "scheduled") {
      callback("Resume Failed: Transfer status is " + transfer.status, null);
      return;
    }
  });

  // Update Status
  Transfer.findOneAndUpdate(filter, update, options, (err, result) => {
    if (err) {
      callback(err, null);
      return;
    } else {
      callback(null, result);
    }
  });
};

// setStatusToComplete sets the status of a transfer to "completed"
const setStatusToComplete = transferID => {
  const filter = { _id: transferID };
  const update = { $set: { status: "completed" } };
  const options = { new: true };

  // Validate Transfer
  Transfer.findOne(filter, (err, transfer) => {
    if (err) {
      callback(err, null);
      return;
    } else if (transfer.status !== "scheduled") {
      callback(
        "Set Status to 'completed' Failed: Transfer status is " +
          transfer.status,
        null
      );
      return;
    }
  });

  // Update Status
  Transfer.findOneAndUpdate(filter, update, options, (err, result) => {
    if (err) {
      callback(err, null);
      return;
    } else {
      callback(null, result);
    }
  });
};

module.exports = {
  checkExpired,
  createTransfer,
  blockTransfer,
  resumeTransfer,
  setStatusToComplete
};
