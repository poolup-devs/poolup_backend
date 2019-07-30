const express = require("express");
const router = new express.Router();
const db = require("../db");

const multiparty = require("multiparty");
const fileType = require("file-type");
const fs = require("fs");
const sha256 = require("sha256");
const chalk = require("chalk");

require("dotenv").config();

//AWS S3 config
const bluebird = require("bluebird");
const S3_BUCKET = process.env.S3_BUCKET;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS = require("aws-sdk");
AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY
});
AWS.config.setPromisesDependency(bluebird);
const s3 = new AWS.S3();

//Test S3 connection
const checkS3Connection = async () => {
  const params = {
    Bucket: S3_BUCKET,
    Key: "connectionTester"
  };
  try {
    await s3.headObject(params).promise();
    console.log("Staging S3 bucket connection successful");
  } catch (err) {
    console.log(
      chalk.red("ERROR: Staging S3 bucket connection failure; check .env file")
    );
  }
};

//User Login
router.get("/login", (req, res) => {
  if (req.query.password) {
    req.query.password = sha256(req.query.password);
  }
  const newToken = sha256(new Date().toString());
  db.login(req.query, newToken, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
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
          db.post(req.body, (err, result) => {
            if (err) {
              res.sendStatus(500);
            } else {
              res.sendStatus(201);
            }
          });
        } else {
          res.status(200).send("User Created Successfully");
        }
      }
    }
  );
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
router.post("/upload-profile-pic", (req, res) => {
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
router.get("/usersPic", (req, res) => {
  db.getPicUrl(req.query.username, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

//Update User Data - NOT IMPLEMENTED IN DB
router.post("/updateUser", (req, res) => {
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

//Upload a user file
const uploadFile = (buffer, name, type) => {
  const params = {
    ACL: "public-read",
    Body: buffer,
    Bucket: S3_BUCKET,
    ContentType: type.mime,
    Key: `${name}.${type.ext}`
  };
  return s3
    .upload(params)
    .promise()
    .catch();
};

module.exports = {
  router: router,
  checkS3Connection: checkS3Connection
};
