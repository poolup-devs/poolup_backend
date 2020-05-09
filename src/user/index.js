const express = require("express");
const router = new express.Router();

const multiparty = require("multiparty");
const fileType = require("file-type");
const fs = require("fs");
const sha256 = require("sha256");
const jwt = require("jsonwebtoken");

const db = require("./controller.js");
const uploadFile = require("../db/awsS3_controller.js").uploadFile;
const deleteFile = require("../db/awsS3_controller.js").deleteFile;
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const JWT_EMAIL_KEY = process.env.JWT_EMAIL_KEY;
const ACCEPTED_EMAIL = process.env.ACCEPTED_EMAIL;
const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;

//User Login
router.post("/users/login", async (req, res) => {
  try {
    if (req.body.password) {
      // req.body.password = sha256(req.body.password);
    }
    const user = await db.login(req.body.email, req.body.password);
    const token = jwt.sign({ username: user.username }, JWT_SECRET_KEY, {
      expiresIn: "24h",
    });
    res.status(200).send({ authToken: token });
  } catch (e) {
    res.status(401).send({ message: e });
  }
});

// User Signup
router.post("/users/signup", async (req, res) => {
  try {
    // Validate form information
    if (await db.isValidPassword(req.body.password)) {
      // Update the verified user's information with account information
      const registeredUser = await db.signup(req.body);
      const token = jwt.sign(
        { username: registeredUser.username },
        JWT_SECRET_KEY,
        { expiresIn: "24h" }
      );
      res.status(201).send({ registeredUser, token });
    }
  } catch (e) {
    res.status(500).send({ error: e });
  }
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
  try {
    const userEmail = jwt.verify(req.query.token, JWT_EMAIL_KEY);
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
    } else if (err.name == "AccountAlreadyRegistered") {
      if (process.env.MODE === "STAGING") {
        res.redirect(302, process.env.FRONT_END_URL + "/login");
      } else {
        res.redirect(302, process.env.FRONT_END_URL + "/login");
      }
    } else {
      res.status(401).send(err);
    }
  }
});

// Validate Username
router.get("/users/usernameValidation", async (req, res) => {
  try {
    const data = await db.findUserByUsername(req.query.username);
    res.status(200).send(data);
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

//Validate User Email
router.get("/users/emailValidation", (req, res) => {
  db.findUserByEmail(req.query.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Validate User Phonenumber
router.get("/users/phoneNumberValidation", (req, res) => {
  db.findUserByPhoneNumber(req.query.phoneNumber, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Get My Info
router.get("/users/my-info", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  db.getMyInfo(authUsername, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Get a User's Info
router.get("/users/info", checkAuth, async (req, res) => {
  try {
    const userName = req.query.username;
    const data = await db.findUserByUsername(userName);
    res.status(200).send(data);
  } catch (e) {
    res.status(500).json({ error: e });
  }
});

//Uploading User Profile Image
router.patch("/users/upload-profile-pic", checkAuth, (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    if (error) {
      return res.status(400).send(error);
    }
    try {
      const path = files.file[0].path;
      const buffer = fs.readFileSync(path);
      const type = fileType(buffer);

      const allowedFileType = ["jpg", "jpeg", "heic", "png"];
      if (!type || !allowedFileType.includes(type.ext)) {
        return res.status(400).send({
          message: "ERROR: file type must be of: jpg, jpeg, heic, or png",
        });
      }

      const username = tokenParser(req.headers.authorization).username;
      const fileName = `bucketFolder/${username}-pic`;

      result = await db.findUserByUsername(username);
      await deleteFile(fileName, result.picType);
      const data = await uploadFile(buffer, fileName, type);

      await db.uploadPicUrl(
        username,
        data.Location,
        type.ext,
        (err, result) => {
          if (err) {
            return res.sendStatus(501);
          } else {
            return res.status(200).send(result);
          }
        }
      );
    } catch (error) {
      return res.status(400).send(error);
    }
  });
});

//Get a User's Profile Image
router.get("/users/usersPic", checkAuth, async (req, res) => {
  try {
    const data = await db.getPicUrl(req.query.username);
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send(err);
  }
});

//Update a User's info (first name, last name, or phoneNumber)
router.patch("/users/updateUser", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  const updates = {};
  if (req.body.firstName) {
    updates.firstName = req.body.firstName;
  }

  if (req.body.lastName) {
    updates.lastName = req.body.lastName;
  }

  if (req.body.phoneNumber) {
    updates.phoneNumber = req.body.phoneNumber;
  }

  db.updateUser(authUsername, updates, (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(result); //reminder: fix this back to w/o result
    }
  });
});

//Delete a User Account
router.delete("/users/deleteUser", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  const fileName = `bucketFolder/${authUsername}-pic`;
  db.getPicType(authUsername, async (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else {
      try {
        await deleteFile(fileName, result.picType);
      } catch (err) {
        return res.status(500);
      }
      db.deleteUser(authUsername, (err, result) => {
        if (err) {
          res.sendStatus(500);
        } else {
          res.sendStatus(200);
        }
      });
    }
  });
});

//confirm credentials
router.post("/users/checkCredentials", checkAuth, async (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  req.body.password = sha256(req.body.password);
  try {
    const result = await db.confirmCredentials(authUsername, req.body.password);
    if (!result) {
      res.sendStatus(401);
    } else {
      res.sendStatus(200);
    }
  } catch (e) {
    console.log(e);
    res.status(500).send(e);
  }
});

//Reset Password
router.patch("/users/changePassword", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  req.body.newPassword = sha256(req.body.newPassword);
  db.passwordReset(authUsername, req.body.newPassword, (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else if (!result) {
      res.sendStatus(401);
    } else {
      res.sendStatus(200);
    }
  });
});

// Get about me
router.get("/users/get-about-me", async (req, res) => {
  try {
    const aboutMe = await db.getAboutMe(req.query.username);
    res.status(200).send({ aboutMe });
  } catch (e) {
    res.status(500).send(e);
  }
});

// Update About Me
router.patch("/users/updateAboutMe", checkAuth, async (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  try {
    const updatedUser = await db.updateAboutMe(authUsername, req.body.aboutMe);
    res.status(200).send(updatedUser);
  } catch (e) {
    res.status(500).send(e);
  }
});

// Get the average rating of a user
router.get("/users/get-rating", async (req, res) => {
  try {
    const averageRating = await db.getAverageRating(req.query.username);
    res.status(200).send({ averageRating });
  } catch (e) {
    res.status(404).send({ error: e });
  }
});

// Check to see if a user is registered as a driver
router.get("/users/driverStatus", checkAuth, async (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;

  try {
    const isDriver = await db.checkIfDriver(authUsername);
    res.status(200).send({ isDriver: isDriver });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
});

// Get public user profile info
router.get("/users/get-public-profile", async (req, res) => {
  try {
    const publicProfileInfo = await db.getPublicProfileInfo(req.query.username);
    res.status(200).send(publicProfileInfo);
  } catch (e) {
    res.status(404).send({ error: e });
  }
});

// Get school
router.get("/users/school", async (req, res) => {
  try {
    const school = await db.getSchool(req.query.username);
    res.status(200).send({ school });
  } catch (e) {
    res.status(404).send({ error: e });
  }
});

module.exports = router;
