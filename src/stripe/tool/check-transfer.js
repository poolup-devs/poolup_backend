const triggerTransfer = require("./payment-handler.js").triggerTransfer;
const TransferDB = require("../transfer/controller.js");
// const rideDB = require("../../ride/controller.js");

const checkTransfer = async () => {
  try {
    // Look for all beta transaction objects that expired
    const expiredTransfers = await TransferDB.checkExpired();
    if (expiredTransfers.length > 0) {
      // If objects exist, then return the res to the corresponding handler under /tool/payment-handler.js
      expiredTransfers.forEach(async (expiredTransfer) => {
        try {
          triggerTransfer(expiredTransfer);
        } catch (e) {
          console.log(e);
        }
      });
    }
    setTimeout(checkTransfer, 50000); // set to check every 5 mins
  } catch (e) {
    console.log(e);
  }
};

module.exports = { checkTransfer };
