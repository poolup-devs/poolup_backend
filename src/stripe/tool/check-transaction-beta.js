const triggerPaymentBeta = require("./payment-handler.js").triggerPaymentBeta;
const intentBetaDB = require("../intentBeta/controller.js");
// const rideDB = require("../../ride/controller.js");

const checkIntentBeta = async () => {
    // Look for all beta transaction objects that expired
    const expiredIntentBetas = await intentBetaDB.checkExpired();
    if(expiredIntentBetas.length>0) {
      // If objects exist, then return the res to the corresponding handler under /tool/payment-handler.js
      triggerPaymentBeta(expiredIntentBetas);
    }
    setTimeout(checkIntentBeta, 50000); // set to check every 5 mins
  }
  
module.exports = {checkIntentBeta};