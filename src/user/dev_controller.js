// dev_controller.js
// A controller file, only for development purposes
// Functions in this file exist only to provide conveninence in development; i.e) testing purposes
// None of the functions in here should be used in the actual workflow of the service

// CONVENTION
// All function names here must start with dev_
// List all parameter requirements

const User = require("./user").User;
const Email = require("./email/email").Email;

/* 
    Create Users with verified Email
    
    Params:
    user_objList = {
        password,
        username,
        firstName,
        email,
        picUrl
    }
*/
const dev_createRegisteredUsers = (user_objList) => {
  return new Promise(async (resolve, reject) => {
    try {
      await User.insertMany(user_objList);
      for (u of user_objList) {
        const email_obj = {
          email: u.email,
          status: "registered",
        };
        await Email.create(email_obj);
      }
    } catch (err) {
      return reject(err);
    }
    return resolve();
  });
};

/*
    Create a dummy User with an alias

    Params:
    alias
*/

const dev_createDummyUserObj = (alias) => {
  const dummyUserObj = {
    firstname: alias,
    lastname: "lastname",
    email: alias + "@ucla.edu",
    password:
      "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  };
  return dummyUserObj;
};

module.exports = {
  dev_createRegisteredUsers,
  dev_createDummyUserObj,
};
