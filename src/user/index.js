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
const deleteFile = require("../db/awsS3_controller.js").deleteFile;
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const JWT_EMAIL_KEY = process.env.JWT_EMAIL_KEY;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

sgMail.setApiKey(SENDGRID_API_KEY);

//User Login
router.post("/users/login", (req, res) => {
  if (req.body.password) {
    req.body.password = sha256(req.body.password);
  }
  db.login(req.body.email, req.body.password, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      const token = jwt.sign({ username: data.username }, JWT_SECRET_KEY, {
        expiresIn: "24h"
      });
      res.status(200).send({
        authToken: token
      });
    }
  });
});

//User Signup
router.post("/users/signup", (req, res) => {
  req.body.password = sha256(req.body.password);
  const ucla_email = req.body.username + "@g.ucla.edu";
  db.checkAvailability(ucla_email, req.body.username, (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else {
      if (result.length === 0) {
        db.signup(req.body, ucla_email, (err, result) => {
          if (err) {
            res.sendStatus(500);
          } else {
            const token = jwt.sign({ email: ucla_email }, JWT_EMAIL_KEY, {
              expiresIn: "24h" //24 hours
            });
            var url = "api.bruinpool.io/users/verify?token=" + token;
            var email = {
              to: ucla_email,
              from: "bruinpool@gmail.com",
              templateId: "d-0d8dff79ca8e4d0e8b4b9b1b12038a62",
              dynamic_template_data: {
                subject: "Bruinpool Email Verification",
                name: req.body.username,
                url: url
              }
            };
            if (process.env.MODE === "STAGING") {
              url = "localhost:3006/users/verify?token=" + token;
              var email = {
                to: ucla_email,
                from: "bruinpool@gmail.com",
                subject: "Bruinpool: Email Verification Required",
                text: "Here's the link",
                html: "Token: <br>" + token +"<br>Link for local dev: " + url
              };
            }
            sgMail
              .send(email)
              .then(() => {
                res.sendStatus(201);
              })
              .catch(error => {
                res.sendStatus(500);
              });
          }
        });
      } else {
        res.status(409).send({
          message:
            "ERROR: User with email / username already exists, or is waiting for email verification"
        });
      }
    }
  });
});

//Verify Email
router.get("/users/verify", (req, res) => {
  try {
    const userEmail = jwt.verify(req.query.token, JWT_EMAIL_KEY);
    db.verifyEmail(userEmail.email, (err, data) => {
      if (err) {
        res.status(400).send(err);
      } else {
        res.redirect("https://bruinpool.io/login");
      }
    });
  } catch (err) {
    res.sendStatus(401);
  }
});

//Validate User Email
router.get("/users/emailValidation", (req, res) => {
  db.emailValidation(req.query.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Validate Username
router.get("/users/usernameValidation", (req, res) => {
  db.usernameValidation(req.query.username, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Validate User Phonenumber
router.get("/users/phoneNumberValidation", (req, res) => {
  db.phoneNumberValidation(req.query.phoneNumber, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

//Get User Info
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

//Uploading User Profile Image
router.post("/users/upload-profile-pic", checkAuth, (req, res) => {
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
      if (!allowedFileType.includes(type.ext)) {
        res.status(400).send({
          message: "ERROR: file type must be of: jpg, jpeg, heic, or png"
        });
      }

      const username = tokenParser(req.headers.authorization).username;
      const fileName = `bucketFolder/${username}-pic`;

      db.getPicType(username, async (err, result) => {
        if (err) return res.sendStatus(500);
        else {
          try {
            await deleteFile(fileName, result.picType);
            const data = await uploadFile(buffer, fileName, type);

            db.uploadPicUrl(
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
          } catch (err) {
            return res.status(500);
          }
        }
      });
    } catch (error) {
      return res.status(400).send(error);
    }
  });
});

//Get a User's Profile Image
router.get("/users/usersPic", checkAuth, (req, res) => {
  db.getPicUrl(req.query.username, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send(data);
    }
  });
});

//Update a User's info (name, phoneNumber)
router.put("/users/updateUser", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  db.updateUser(
    authUsername,
    req.body.name,
    req.body.phoneNumber,
    (err, result) => {
      if (err) {
        res.sendStatus(500);
      } else {
        res.status(200).send(result); //reminder: fix this back to w/o result
      }
    }
  );
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
router.post("/users/checkCredentials", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  req.body.password = sha256(req.body.password);
  db.confirmCredentials(authUsername, req.body.password, (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else if (result) {
      res.sendStatus(200);
    } else {
      res.sendStatus(401);
    }
  });
});

//Reset Password
router.post("/users/changePassword", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  req.body.newPassword = sha256(req.body.newPassword);
  db.passwordReset(authUsername, req.body.newPassword, (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.sendStatus(200);
    }
  });
});

module.exports = router;
