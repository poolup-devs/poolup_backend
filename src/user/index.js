const express = require("express");
const router = new express.Router();

const sha256 = require("sha256");
const jwt = require("jsonwebtoken");

const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");
const errResp = require("../utils/errors/errResponse");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

//User Login
router.post("/users/login", async (req, res) => {
  try {
    if (req.body.password) {
      req.body.password = sha256(req.body.password);
    }
    const user = await db.login(req.body.email, req.body.password);
    const token = jwt.sign({ username: user.username, _id: user._id }, JWT_SECRET_KEY, {
      expiresIn: "24h",
    });
    res.status(200).send({ authToken: token });
  } catch (err) {
    errResp(res, err);
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
        { username: registeredUser.username, _id: registeredUser._id },
        JWT_SECRET_KEY,
        { expiresIn: "24h" }
      );
      res.status(201).send({ registeredUser, token });
    }
  } catch (err) {
    errResp(res, err);
  }
});

//Get a User's Info
router.get("/users/info", checkAuth, async (req, res) => {
  try {
    const userName = req.query.username;
    const data = await db.findUserByUsername(userName);
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Uploading User Profile Image
router.patch("/users/upload-profile-pic", checkAuth, async (req, res) => {
  try {
    const authUsername = await tokenParser(req.headers.authorization);
    const data = await db.updateProfilePic(authUsername, req);
    res.status(200).send(data);
  } catch (err) {
    return errResp(res, err);
  }
});

//Get a User's Profile Image
router.get("/users/usersPic", checkAuth, async (req, res) => {
  try {
    const data = await db.getPicUrl(req.query.username);
    res.status(200).send(data);
  } catch (err) {
    errResp(res, err);
  }
});

//Update a User's info (first name, last name, or phoneNumber)
router.patch("/users/updateUser", checkAuth, async (req, res) => {
  const authUsername = await tokenParser(req.headers.authorization);
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
      errResp(res, err);
    } else {
      res.status(200).send(result); //reminder: fix this back to w/o result
    }
  });
});

//confirm credentials
router.post("/users/checkCredentials", checkAuth, async (req, res) => {
  const authUsername = await tokenParser(req.headers.authorization);
  req.body.password = sha256(req.body.password);
  try {
    const result = await db.confirmCredentials(authUsername, req.body.password);
    if (!result) {
      errResp(res, new Error("credential failed"));
    } else {
      res.sendStatus(200);
    }
  } catch (err) {
    errResp(res, err);
  }
});

//Reset Password
router.patch("/users/changePassword", checkAuth, async (req, res) => {
  const authUsername = await tokenParser(req.headers.authorization);
  req.body.newPassword = sha256(req.body.newPassword);
  db.passwordReset(authUsername, req.body.newPassword, (err, result) => {
    if (err) {
      errResp(res, err);
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
  } catch (err) {
    errResp(res, err);
  }
});

// Update About Me
router.patch("/users/updateAboutMe", checkAuth, async (req, res) => {
  const authUsername = await tokenParser(req.headers.authorization);
  try {
    const updatedUser = await db.updateAboutMe(authUsername, req.body.aboutMe);
    res.status(200).send(updatedUser);
  } catch (err) {
    errResp(res, err);
  }
});

// Get the average rating of a user
router.get("/users/get-rating", async (req, res) => {
  try {
    const averageRating = await db.getAverageRating(req.query.username);
    res.status(200).send({ averageRating });
  } catch (err) {
    errResp(res, err);
  }
});

// Check to see if a user is registered as a driver
router.get("/users/driverStatus", checkAuth, async (req, res) => {
  const authUsername = await tokenParser(req.headers.authorization);

  try {
    const isDriver = await db.checkIfDriver(authUsername);
    res.status(200).send({ isDriver: isDriver });
  } catch (err) {
    errResp(res, err);
  }
});

// Get public user profile info
router.get("/users/get-public-profile", async (req, res) => {
  try {
    const publicProfileInfo = await db.getPublicProfileInfo(req.query.username);
    res.status(200).send(publicProfileInfo);
  } catch (err) {
    errResp(res, err);
  }
});

// Get school
router.get("/users/get-school", async (req, res) => {
  try {
    const school = await db.getSchool(req.query.username);
    res.status(200).send({ school });
  } catch (err) {
    errResp(res, err);
  }
});

module.exports = router;
