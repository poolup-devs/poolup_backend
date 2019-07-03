const express = require('express');
const bodyParser = require('body-parser');
const sha256 = require('js-sha256');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const S3_BUCKET = process.env.S3_BUCKET;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const AWS = require('aws-sdk');
const fs = require('fs');
const fileType = require('file-type');
const bluebird = require('bluebird');
const multiparty = require('multiparty');

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
});

AWS.config.setPromisesDependency(bluebird);
const s3 = new AWS.S3();

const uploadFile = (buffer, name, type) => {
  const params = {
    ACL: 'public-read',
    Body: buffer,
    Bucket: S3_BUCKET,
    ContentType: type.mime,
    Key: `${name}.${type.ext}`
  };
  return s3.upload(params).promise();
};

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/../public'));

app.get('/test-connection', (req,res)=>{
  res.send({
    "name":"Han"
  })
})

app.post('/upload-profile-pic', (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    if (error) throw new Error(error);
    try {
      const path = files.file[0].path;
      const buffer = fs.readFileSync(path);
      const type = fileType(buffer);
      const timestamp = Date.now().toString();
      const fileName = `bucketFolder/${timestamp}-lg`;
      const data = await uploadFile(buffer, fileName, type);
      db.uploadPicUrl(req.headers.userid, data.Location, (err, result) => {
        console.log(result);
        if (err) {
          return res.sendStatus(501);
        } else {
          return res.sendStatus(200);
        }
      })
    } catch (error) {
      console.log(error);
      return res.status(400).send(error);
    }
  });
});

app.get('/login', (req, res) => {
  if (req.query.password) {
    req.query.password = sha256(req.query.password);
  }
  const newToken = sha256((new Date()).toString());
  db.login(req.query, newToken, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

app.get('/rideList', (req, res) => {
  db.getList(req.query, req.query.type, req.query.pageNum, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

app.post('/rideList', (req, res) => {
  db.postRide(req.body.rideInfo, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

app.put('/rideList', (req, res) => {
  db.rideUpdate(req.body.entry, req.body.userInfo, req.body.status, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

app.delete('/rideList', (req, res) => {
  const ride = JSON.parse(req.query.ride);
  db.rideDelete(ride._id, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(200).send(data);
    }
  });
});

app.get('/usersPic', (req, res) => {
  db.getPicUrl(req.query.username, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

app.get('/notification', (req, res) => {
  const authToken = JSON.parse(req.query.authToken);
  db.getNoti(authToken.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

app.put('/notification', (req, res) => {
  db.updateNoti(req.body.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

app.get('/emailValidation', (req, res) => {
  db.emailValidation(req.query.email, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

app.get('/usernameValidation', (req, res) => {
  db.usernameValidation(req.query.username, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

app.get('/phoneNumberValidation', (req, res) => {
  db.phoneNumberValidation(req.query.phoneNumber, (err, data) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(data);
    }
  });
});

app.post('/signup', (req, res) => {
  req.body.password = sha256(req.body.password);
  db.checkAvailability(req.body.email, req.body.username, req.body.phoneNumber, (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else {
      if (result.length === 0) {
        db.post(req.body, (err, result) => {
          if(err) {
            res.sendStatus(500);
          } else {
            res.sendStatus(201);
          }
        });
      } else {
        res.sendStatus(200);
      }
    }
  });
});

app.post('/updateUser', (req, res) => {
  db.updateUser(req.body.email, req.body.username, req.body.vid_id, req.body.pull, (err, result) => {
    if (err) {
      res.sendStatus(500);
    } else {
      res.status(201).send(result);
    }
  });
});

app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '/../public/index.html'), (err) => {
    if (err) {
      res.status(500).send(err);
    }
  });
});


app.listen(process.env.PORT || 3000, () => {
  console.log('listening!');
});