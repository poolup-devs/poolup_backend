const express = require("express");
const router = new express.Router();

const multiparty = require("multiparty");
const fileType = require("file-type");
const fs = require("fs");
const sha256 = require("sha256");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");

const db = require("./controller.js");
const uploadFile = require("../db/awsS3_controller.js").uploadFile;
const checkAuth = require("../middleware/jwt_authenticator.js");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const JWT_EMAIL_KEY = process.env.JWT_EMAIL_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

sgMail.setApiKey(SENDGRID_API_KEY);

//User Login
router.post("/login", (req, res) => {
  if (req.body.password) {
    req.body.password = sha256(req.body.password);
  }
  db.login(req.body.email, req.body.password, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      const token = jwt.sign({ _id: data._id }, JWT_SECRET_KEY, {
        expiresIn: "1h"
      });
      data = data.toJSON();
      data.authorization = token;
      res.status(200).send(data);
    }
  });
});

//User Signup
router.post("/signup", (req, res) => {
  req.body.password = sha256(req.body.password);
  db.checkAvailability(
    req.body.email,
    req.body.username,
    req.body.phoneNumber,
    (err, result) => {
      if (err) {
        res.sendStatus(500);
      } else {
        if (result.length === 0) {
          db.signup(req.body, (err, result) => {
            if (err) {
              res.sendStatus(500);
            } else {
              const token = jwt.sign({ email: req.body.email }, JWT_EMAIL_KEY, {
                expiresIn: 60000 //10 minutes
              });
              const url = "bruinpool.io?authorization=" + token;
              const email = {
                to: req.body.email,
                from: "bruinpool@gmail.com",
                subject: "Bruinpool: Email Verification Required",
                text: "Here's the link",
                html: "Here's the link: " + url
              };
              sgMail
                .send(email)
                .then(() => {
                  res.sendStatus(201);
                })
                .catch(error => {
                  console.log(error);
                  res.sendStatus(500);
                });
            }
          });
        } else {
          res.status(409).send({
            message:
              "User with email / username already exists, or is waiting for email verification"
          });
        }
      }
    }
  );
});

//Verify Email
router.get("/verify", (req, res) => {
  try {
    const userEmail = jwt.verify(req.query.token, JWT_EMAIL_KEY);
    console.log(userEmail.email);
    db.verifyEmail(userEmail.email, (err, data) => {
      if (err) {
        res.sendStatus(400);
      } else {
        res.redirect("https://bruinpool.io");
      }
    });
  } catch (err) {
    res.sendStatus(401);
  }
});

//Validate User Email
router.get("/emailValidation", (req, res) => {
  db.emailValidation(req.query.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

//Validate Username
router.get("/usernameValidation", (req, res) => {
  db.usernameValidation(req.query.username, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

//Validate User Phonenumber
router.get("/phoneNumberValidation", (req, res) => {
  db.phoneNumberValidation(req.query.phoneNumber, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

//Uploading User Profile Image
router.post("/upload-profile-pic", checkAuth, (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    if (error) {
      return res.status(400).send(error);
    }
    try {
      const path = files.file[0].path;
      const buffer = fs.readFileSync(path);
      const type = fileType(buffer);
      const timestamp = Date.now().toString();
      const fileName = `bucketFolder/${timestamp}-lg`;
      const data = await uploadFile(buffer, fileName, type);
      db.uploadPicUrl(req.headers.userid, data.Location, (err, result) => {
        if (err) {
          return res.sendStatus(501);
        } else {
          return res.sendStatus(200);
        }
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
});

//Get a User's Profile Image
router.get("/usersPic", checkAuth, (req, res) => {
  db.getPicUrl(req.query.username, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

//Update User Data - NOT IMPLEMENTED IN DB
router.post("/updateUser", checkAuth, (req, res) => {
  db.updateUser(
    req.body.email,
    req.body.username,
    req.body.vid_id,
    req.body.pull,
    (err, result) => {
      if (err) {
        res.sendStatus(500);
      } else {
        res.status(201).send(result);
      }
    }
  );
});

module.exports = router;
