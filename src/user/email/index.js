const express = require("express");
const router = new express.Router();

const db = require("./controller.js");
const jwt = require("jsonwebtoken");

const errResp = require("../../utils/errors/errResponse");

// Send verification email
router.get("/users/sendVerificationEmail", async (req, res) => {
  try {
    await db.sendVerificationEmail(req.query.email);
    res.status(200).send("Verification email sent successfully.");
  } catch (err) {
    // errResp(res, err)
    errResp(res, err);
  }
});

// Verify Email
router.get("/users/verify", async (req, res) => {
  let userEmail;

  // check verification token validity
  try {
    userEmail = jwt.verify(req.query.token, process.env.JWT_EMAIL_KEY);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      if (process.env.MODE === "STAGING" || process.env.MODE === "TESTING") {
        return res.redirect(
          302,
          process.env.FRONT_END_URL +
            `/signup/2/expired?email=${req.query.email}`
        );
      } else {
        return res.redirect(
          302,
          process.env.FRONT_END_URL +
            `/signup/2/expired?email=${req.query.email}`
        );
      }
    } else {
      return errResp(res, err);
    }
  }

  // check email status
  try {
    await db.verifyEmail(userEmail.email);
    // Redirect to register the user's name and password
    if (process.env.MODE === "STAGING" || process.env.MODE === "TESTING") {
      return res.redirect(
        302,
        process.env.FRONT_END_URL + `/signup/3?email=${userEmail.email}`
      );
    } else {
      return res.redirect(
        302,
        process.env.FRONT_END_URL + `/signup/3?email=${userEmail.email}`
      );
    }
  } catch (err) {
    if (err.message == "The email is in pre-registration status") {
      return res.redirect(
        302,
        process.env.FRONT_END_URL + `/signup/3?email=${userEmail.email}`
      );
    }
    return errResp(res, err);
  }
});

module.exports = router;
