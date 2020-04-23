const EmailToVerify = require("./emailToVerify").EmailToVerify;

const jwt = require("jsonwebtoken");
const parseDomain = require("parse-domain");
const isEmail = require("isemail");

const Error = require("../../utils/error-model");
const Email = require("../../utils/email/email");

const VERIFICATION_EMAIL_EXPIRY = 60 * 30;

const sendVerificationEmail = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (await isValidEmail(email)) {
        // Construct verification email
        const token = jwt.sign({ email }, process.env.JWT_EMAIL_KEY, {
          expiresIn: VERIFICATION_EMAIL_EXPIRY,
        });
        if (process.env.MODE === "STAGING") {
          var verificationUrl = `http://localhost:${process.env.PORT}/users/verify?email=${email}&token=${token}`;
        } else {
          var verificationUrl = `http://restapi.${process.env.PRODUCTION_DOMAIN_URL}/users/verify?email=${email}&token=${token}`;
        }
        await Email.sendVerificationEmail(email, verificationUrl);
        await EmailToVerify.create({ email });
        resolve(true);
      }
    } catch (err) {
      if (
        err.message ===
        "Verification email was sent, but email has not been verified"
      ) {
        try {
          await resendVerificationEmail(email);
          return resolve(true);
        } catch (err_) {
          return reject(Error(500, err_));
        }
      } else {
        return reject(Error(500, err));
      }
    }
  });
};

const resendVerificationEmail = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await EmailToVerify.findOne({ email });
      if (res == null) {
        return reject("Email is not under verification yet");
      } else if (res.verified == true) {
        return reject("Email has already been verified");
      } else if (res.remainingResendAmt < 1) {
        return reject("Verification Email resend limit reached");
      }

      const token = jwt.sign({ email }, process.env.JWT_EMAIL_KEY, {
        expiresIn: VERIFICATION_EMAIL_EXPIRY,
      });
      if (process.env.MODE === "STAGING") {
        var verificationUrl = `http://localhost:${process.env.PORT}/users/verify?email=${email}&token=${token}`;
      } else {
        var verificationUrl = `http://restapi.${process.env.PRODUCTION_DOMAIN_URL}/users/verify?email=${email}&token=${token}`;
      }
      await Email.sendVerificationEmail(email, verificationUrl);
      await EmailToVerify.findByIdAndUpdate(res._id, {
        $inc: { remainingResendAmt: -1 },
      });
      return resolve(true);
    } catch (err) {
      return reject(err);
    }
  });
};

const isValidEmail = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate email address
      if (!isEmail.validate(email)) {
        return reject(Error(400, "Not a valid email address!"));
      }
      const emailDomain = parseDomain(email);
      if (!emailDomain || emailDomain.tld !== "edu") {
        return reject(Error(400, "Not an .edu email address!"));
      }
      const emailStatus = await getEmailStatus(email);
      switch (emailStatus) {
        case "Uninitialized Email": {
          return resolve(true);
        }
        case "Unverified Email": {
          return reject(
            Error(
              400,
              "Verification email was sent, but email has not been verified"
            )
          );
        }
        case "Unregistered Email": {
          return reject(
            Error(400, "Email is verified, but account has not been set up yet")
          );
        }
        case "Registered Email": {
          return reject(Error(400, "User account already exists"));
        }
        default: {
          return reject(Error(500, "Email status unrecognized"));
        }
      }
    } catch (err) {
      return reject(Error(500));
    }
  });
};

const verifyEmail = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      if ((await User.findOne({ email })) != null) {
        return reject(Error(400, "AccountAlreadyRegistered"));
      }
      const verifiedEmail = await EmailToVerify.findOneAndUpdate(
        { email },
        { verified: true },
        { new: true }
      );
      if (verifiedEmail === null) {
        return reject(Error(400, ""));
      }
      return resolve();
    } catch (err) {
      return reject(Error(500, err));
    }
  });
};

const getEmailStatus = (email) => {
  return new Promise(async (resolve, reject) => {
    try {
      const email_res = await EmailToVerify.findOne({ email });
      if (email_res == null) {
        return resolve("Uninitialized Email");
      } else if (email_res.verified === false) {
        return resolve("Unverified Email");
      }
      const user_res = await User.findOne({ email });
      if (user_res == null) {
        return resolve("Unregistered Email");
      } else {
        return resolve("Registered Email");
      }
    } catch (err) {
      return reject(Error(500));
    }
  });
};

module.exports = {
  sendVerificationEmail,
  resendVerificationEmail,
  verifyEmail,
};
