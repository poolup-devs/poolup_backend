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
const ACCEPTED_EMAIL = process.env.ACCEPTED_EMAIL;


sgMail.setApiKey(SENDGRID_API_KEY);

//User Login
router.post("/users/login", (req, res) => {
  if (req.body.password) {
    req.body.password = sha256(req.body.password);
  }
  db.login(req.body.email, req.body.password, (err, data) => {
    if (err) {
      res.status(401).send(err);
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
  const accepted_email = req.body.username.toLowerCase() + process.env.ACCEPTED_EMAIL;
  db.checkAvailability(accepted_email, req.body.username, (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else {
      if (result.length === 0) {
        db.signup(req.body, accepted_email, (err, result) => {
          if (err) {
            res.sendStatus(500);
          } else {
            const token = jwt.sign({ email: accepted_email }, JWT_EMAIL_KEY, {
              expiresIn: "24h" //24 hours
            });
            var url = "restapi." + process.env.PRODUCTION_DOMAIN_URL + "/users/verify?token=" + token;
            var email = {
              to: accepted_email,
              from: "pool-up@outlook.com",
              templateId: "d-0d8dff79ca8e4d0e8b4b9b1b12038a62",
              dynamic_template_data: {
                subject: "PoolUp Email Verification",
                name: req.body.username,
                url: url
              }
            };
            if (process.env.MODE === "STAGING") {
              url = "localhost:"+process.env.PORT+"/users/verify?token=" + token;
              var email = {
                to: accepted_email,
                from: "pool-up@outlook.com",
                subject: "PoolUp: Email Verification Required",
                text: "Here's the link",
                html: "<br>Link for local dev: <br>" + url
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
        res.redirect("https://"+ process.env.PRODUCTION_DOMAIN_URL+ "/login");
      }
    });
  } catch (err) {
    res.sendStatus(401);
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

// Validate Username 
router.get("/users/usernameValidation", (req, res) => {
  db.findUserByUsername(req.query.username, (err, data) => {
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
          message: "ERROR: file type must be of: jpg, jpeg, heic, or png"
        });
      }

      const username = tokenParser(req.headers.authorization).username;
      const fileName = `bucketFolder/${username}-pic`;

      db.findUserByUsername(username, async (err, result) => {
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

//Update a User's info (name or phoneNumber)
router.patch("/users/updateUser", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  const updates = {} 
  if (req.body.name) {
    updates.name = req.body.name 
  }

  if (req.body.phoneNumber) {
    updates.phoneNumber = req.body.phoneNumber
  }
  
  db.updateUser(
    authUsername,
    updates,
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
    } else if (!result) {
      res.sendStatus(401);
    }
    else {
      res.sendStatus(200);
    }
  });
});

//Reset Password
router.patch("/users/changePassword", checkAuth, (req, res) => {
  const authUsername = tokenParser(req.headers.authorization).username;
  req.body.newPassword = sha256(req.body.newPassword);
  db.passwordReset(authUsername, req.body.newPassword, (err, result) => {
    if (err) {
      res.sendStatus(500);
    }
    else if (!result) {
      res.sendStatus(401);
    } 
    else {
      res.sendStatus(200);
    }
  });
});

// Get the average rating of a user 
router.get("/users/get-rating", async (req, res) => {
  try {
      const averageRating = await db.getAverageRating(req.query.username)
      res.status(200).send({averageRating})
  }
  catch(e) {
    res.status(404).send({error: e}) 
  }
})


module.exports = router;
