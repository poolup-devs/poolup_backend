const triggerTransfer = require("./payment-handler.js").triggerTransfer;
const TransferDB = require("../transfer/controller.js");
// const rideDB = require("../../ride/controller.js");

const checkTransfer = async () => {
  // Look for all beta transaction objects that expired
  const expiredTransfers = await TransferDB.checkExpired();
  if (expiredTransfers.length > 0) {
    // If objects exist, then return the res to the corresponding handler under /tool/payment-handler.js
    expiredTransfers.forEach((expiredTransfer) => {
      const applicationFeePercentage =
        parseFloat(process.env.STRIPE_APPLICATION_FEE) || 0;

      expiredTransfer.amount =
        expiredTransfer.amount -
        expiredTransfer.amount * applicationFeePercentage;
      triggerTransfer(expiredTransfer);
    });
  }
  setTimeout(checkTransfer, 50000); // set to check every 5 mins
};

module.exports = { checkTransfer };
