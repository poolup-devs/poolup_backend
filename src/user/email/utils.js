const Email = require("./email.js").Email;

const parseDomain = require("parse-domain");
const isEmail = require("isemail");
const Error = require("../../utils/error-model");

// isValidEmailToVerify -- helper function
// return values:
// 1 :  email can be verified
// -1: not a valid email address
// -2: not an .edu email address
// -3: verification email resend limit reached
// -4: email already verified
// 0 : internal error
const isValidEmailToVerify = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate email address
      if (!isEmail.validate(email)) {
        return resolve(-1);
      }
      // Must be student email
      const emailDomain = parseDomain(email);
      if (!emailDomain || emailDomain.tld !== "edu") {
        return resolve(-2);
      }
      // if email is already in our email db
      const res_email = await Email.findOne({ email: email.trim() });
      if (res_email) {
        if (res_email.status == "pre-verification") {
          if (res_email.remainingResendAmount < 1) {
            return resolve(-3);
          }
          return resolve(1);
        } else {
          return resolve(-4);
        }
      }
    } catch (err) {
      return reject(err);
    }
    return resolve(1);
  });
};

// isValidEmailToRegister -- helper function
// return values:
// 1 : email can be registered with
// -1: email not verified
// -2: email already registered
// 0 : internal error
const isValidEmailToRegister = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res_email = await Email.findOne({ email: email.trim() });
      if (res_email) {
        if (res_email.status == "pre-registration") {
          return resolve(1);
        } else if (res_email.status == "registered") {
          return resolve(-2);
        }
      }
      return resolve(-1);
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  isValidEmailToVerify,
  isValidEmailToRegister,
};
