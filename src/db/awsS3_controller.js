require("dotenv").config();
const chalk = require("chalk");

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
    console.log(
      chalk.green("[INIT]: ") +
        "S3 bucket connection to " +
        chalk.yellow(S3_BUCKET) +
        " successful"
    );
  } catch (err) {
    console.log(
      chalk.red("ERROR: Staging S3 bucket connection failure; check .env file")
    );
  }
};

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
  s3,
  checkS3Connection,
  uploadFile
};
