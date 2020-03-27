const Transfer = require("./transfer.js").Transfer;

const createTransfer = transferInfo => {
  return new Promise(async (resolve, reject) => {
    try {
      const newTransfer = await new Transfer(transferInfo).save();
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

// TODO: Block Transfers for a ride (in case of claim)
// Block Transfer
const blockTransfer = (transferID, callback) => {
  const filter = { _id: transferID };
  const update = { $set: { status: "blocked" } };
  const options = { new: true };

  // Validate Transfer
  Transfer.findTransfer(filter, (err, result) => {
    if (err) {
      callback(err, null);
      return;
    } else {
      let transfer = result[0];

      if (transfer.status !== "scheduled") {
        callback("Block Failed: Transfer status is " + transfer.status, null);
        return;
      }
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

// Resume Transfer
const resumeTransfer = (transferID, callback) => {
  const filter = { _id: transferID };
  const update = { $set: { status: "scheduled" } };
  const options = { new: true };

  // Validate Transfer
  Transfer.findTransfer(filter, (err, result) => {
    if (err) {
      callback(err, null);
      return;
    } else {
      let transfer = result[0];
      if (transfer.status !== "blocked") {
        callback("Resume Failed: Transfer status is " + transfer.status, null);
        return;
      }
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

const setStatusToTransfered = transferID => {
  const filter = { _id: transferID };
  const update = { $set: { status: "transfered" } };
  const options = { new: true };

  // Validate Transfer
  Transfer.findTransfer(filter, (err, result) => {
    if (err) {
      callback(err, null);
      return;
    } else {
      let transfer = result[0];

      if (transfer.status !== "scheduled") {
        callback(
          "Set To Transfered Failed: Transfer status is " + transfer.status,
          null
        );
        return;
      }
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

const findTransfer = (query, callback) => {
  Transfer.find(query, (err, result) => {
    if (err) {
      callback(err, null);
    } else if (result.length === 0) {
      callback("No Transfer Found", null);
    } else if (result.length > 1) {
      // callback("Multiple Transfers Found", null);
      callback(null, result[0]);
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
  setStatusToTransfered,
  findTransfer
};
