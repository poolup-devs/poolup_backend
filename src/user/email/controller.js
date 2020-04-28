const Email = require("./email.js").Email;

const jwt = require("jsonwebtoken");
const parseDomain = require("parse-domain");
const isEmail = require("isemail");

const Error = require("../../utils/error-model");
const EmailUtil = require("../../utils/email/email");

const VERIFICATION_EMAIL_EXPIRY = 60 * 30;

const isValidEmailToVerify = (email) => {
  console.log("fucks");
  return new Promise(async (resolve, reject) => {
    // Validate email address
    if (!isEmail.validate(email)) {
      return reject(Error(400, "Not a valid email address!"));
    }

    // Must be student email
    const emailDomain = parseDomain(email);
    if (!emailDomain || emailDomain.tld !== "edu") {
      return reject(Error(400, "Not an .edu email address!"));
    }

    // if email is already in our email db
    const email = await Email.findOne({ email: email.trim() });
    if (email) {
      if (email.status == "pre-verification") {
        if (email.remainingResendAmount < 1) {
          return reject(
            Error(
              403,
              "Verification email has been resent too much times, reached limit (10)"
            )
          );
        }
        return resolve(true);
      } else {
        return reject(Error(403, "The email is already verified"));
      }
    }
    return resolve(true);
  });
};

const sendVerificationEmail = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (await isValidEmailToVerify(email)) {
        // Construct verification email
        const token = jwt.sign({ email }, process.env.JWT_EMAIL_KEY, {
          expiresIn: 60 * 30,
        });
        if (process.env.MODE === "STAGING") {
          var verificationUrl = `http://localhost:${process.env.PORT}/users/verify?email=${email}&token=${token}`;
        } else {
          var verificationUrl = `https://restapi.poolup.co/users/verify?email=${email}&token=${token}`;
        }

        const res_email = await Email.findOne({ email });
        if (res_email) {
          await EmailUtil.sendVerificationEmail(email, verificationUrl);
          Email.findByIdAndUpdate(res_email._id, {
            $inc: { remainingResendAmount: -1 },
          });
        } else {
          Email.create({ email });
          await EmailUtil.sendVerificationEmail(email, verificationUrl);
        }

        return resolve(true);
      }
    } catch (err) {
      reject(err);
    }
  });
};

// Adds a user with a verified email to the database.
// The user will become permanent only once it is registered with a name and password.
const verifyEmail = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res_email = await Email.findOne({ email });
      if (!res_email) {
        return reject(Error(404, "Email not found"));
      }
      if (res_email.status != "pre-verification") {
        return reject(Error(403, `The email is in ${res_email.status} status`));
      }

      await Email.findByIdAndUpdate(res_email._id, {
        status: "pre-registration",
      });
      return resolve(true);
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

module.exports = {
  isValidEmailToVerify,
  sendVerificationEmail,
  verifyEmail,
};
