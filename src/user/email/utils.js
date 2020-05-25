const Email = require("./email.js").Email;

const parseDomain = require("parse-domain");
const isEmail = require("isemail");

// isValidEmailToVerify -- helper function
// return values:

// valid email
// not a valid email address
// not an .edu email address
// verification email resend limit reached
// email already verified

const isValidEmailToVerify = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate email address
      if (!isEmail.validate(email)) {
        return resolve("not a valid email address");
      }
      // Must be student email
      const emailDomain = parseDomain(email);
      if (!emailDomain || emailDomain.tld !== "edu") {
        return resolve("not an .edu email address");
      }
      // if email is already in our email db
      const res_email = await Email.findOne({ email: email.trim() });
      if (res_email) {
        if (res_email.status == "pre-verification") {
          if (res_email.remainingResendAmount < 1) {
            return resolve("verification email resend limit reached");
          }
          return resolve("valid email");
        } else {
          return resolve("email already verified");
        }
      }
    } catch (err) {
      return reject(err);
    }
    return resolve("valid email");
  });
};

// isValidEmailToRegister -- helper function

// return values:
// email can be registered
// email not verified
// email already registered

const isValidEmailToRegister = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res_email = await Email.findOne({ email: email.trim() });
      if (res_email) {
        if (res_email.status == "pre-registration") {
          return resolve("email can be registered");
        } else if (res_email.status == "registered") {
          return resolve("email already registered");
        }
      }
      return resolve("email not verified");
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  isValidEmailToVerify,
  isValidEmailToRegister,
};
