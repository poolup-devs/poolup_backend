const Email = require("./email.js").Email;

const jwt = require("jsonwebtoken");

const Error = require("../../utils/error-model");
const EmailUtil = require("../../utils/email/email");
const isValidEmailToVerify = require("./utils.js").isValidEmailToVerify;

const VERIFICATION_EMAIL_EXPIRY = 60 * 30;

const sendVerificationEmail = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const v = await isValidEmailToVerify(email);
      switch (v) {
        case "valid email": {
          // Construct verification email
          const token = jwt.sign({ email }, process.env.JWT_EMAIL_KEY, {
            expiresIn: VERIFICATION_EMAIL_EXPIRY,
          });
          if (
            process.env.MODE === "STAGING" ||
            process.env.MODE === "TESTING"
          ) {
            var verificationUrl = `http://localhost:${process.env.PORT}/users/verify?email=${email}&token=${token}`;
          } else {
            var verificationUrl = `https://restapi.poolup.co/users/verify?email=${email}&token=${token}`;
          }

          const res_email = await Email.findOne({ email });
          if (res_email) {
            await EmailUtil.sendVerificationEmail(email, verificationUrl);
            await Email.findByIdAndUpdate(res_email._id, {
              $inc: { remainingResendAmount: -1 },
            });
          } else {
            await Email.create({ email });
            await EmailUtil.sendVerificationEmail(email, verificationUrl);
          }
          return resolve(true);
        }
        case "not a valid email address":
          return reject(Error(400, "Not a valid email address"));
        case "not an .edu email address":
          return reject(Error(400, "Not an .edu email address"));
        case "verification email resend limit reached":
          return reject(Error(403, "Verification email resend limit reached"));
        case "email already verified":
          return reject(Error(403, "Email already verified"));
        default: {
          return reject(Error(500));
        }
      }
    } catch (err) {
      return reject(Error(500, err));
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
      await Email.findByIdAndUpdate(
        res_email._id,
        {
          status: "pre-registration",
        },
        { runValidators: true }
      );
      return resolve(true);
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

module.exports = {
  sendVerificationEmail,
  verifyEmail,
};
