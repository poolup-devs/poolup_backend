const express = require("express");
const router = new express.Router();

const db = require("./controller.js");

//Validate User Email
router.get("/users/emailValidation", (req, res) => {
  db.isValidEmailToVerify(req.query.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

// Send verification email
router.get("/users/sendVerificationEmail", async (req, res) => {
  try {
    await db.sendVerificationEmail(req.query.email);
    res.status(200).send("Verification email sent successfully.");
  } catch (e) {
    res.status(500).send(e);
  }
});

// Verify Email
router.get("/users/verify", async (req, res) => {
  let userEmail;

  // check verification token validity
  try {
    userEmail = jwt.verify(req.query.token, JWT_EMAIL_KEY);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      if (process.env.MODE === "STAGING") {
        res.redirect(
          302,
          process.env.FRONT_END_URL +
            `/signup/2/expired?email=${req.query.email}`
        );
      } else {
        res.redirect(
          302,
          process.env.FRONT_END_URL +
            `/signup/2/expired?email=${req.query.email}`
        );
      }
    }
  }

  // check email status
  try {
    await db.verifyEmail(userEmail.email);
    // Redirect to register the user's name and password
    if (process.env.MODE === "STAGING") {
      res.redirect(
        302,
        process.env.FRONT_END_URL + `/signup/3?email=${userEmail.email}`
      );
    } else {
      res.redirect(
        302,
        process.env.FRONT_END_URL + `/signup/3?email=${userEmail.email}`
      );
    }
  } catch (err) {
    switch (err.message) {
      case "Email not found": {
        break;
      }
      case "The email is in pre-registration status": {
        break;
      }
      case "The email is in registered status": {
        break;
      }
      default: {
        res.status(err.status).send(err.message);
        break;
      }
    }
    //
    // TALK WITH JUSTIN HERE
    ///
    // if (err.name == "AccountAlreadyRegistered") {
    //   if (process.env.MODE === "STAGING") {
    //     res.redirect(302, process.env.FRONT_END_URL + "/login");
    //   } else {
    //     res.redirect(302, process.env.FRONT_END_URL + "/login");
    //   }
    // } else {
    //   res.status(401).send(err);
    // }
  }
});

module.exports = router;
