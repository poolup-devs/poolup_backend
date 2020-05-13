const jwt = require("jsonwebtoken");
const Error = require("../utils/error-model");
// require("dotenv").config();
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

const User = require("../user/user").User;

const getAuthUsername = (authorization) => {
  return new Promise(async (resolve, reject) => {
    try {
      const token = authorization.split(" ")[1];
      const decoded = jwt.verify(token, JWT_SECRET_KEY);

      const validUser = await User.findById(decoded._id);
      if (!validUser && process.env.MODE != "TESTING") {
        return reject(Error(404, "User with the authToken not found"));
      }
      return resolve(decoded.username);
    } catch (error) {
      return reject(Error(500, error));
    }
  });
};

module.exports = getAuthUsername;
