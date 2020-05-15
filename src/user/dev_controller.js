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
    Create a single User with verified Email
    
    Params:
    user_obj = {
        password,
        username,
        firstName,
        email,
        picUrl
    }
*/
const dev_createRegisteredUser = (user_obj) => {
  return new Promise(async (resolve, reject) => {
    try {
      user_obj.username = user_obj.email.split("@")[0];
      const u = await User.create(user_obj);
      await Email.create({ email: user_obj.email, status: "registered" });
      return resolve(u);
    } catch (err) {
      return reject(err);
    }
  });
};

/* 
    Create Multiple Users with verified Email
    
    Params:
    user_objList = [{
        password,
        username,
        firstName,
        email,
        picUrl
    }]
*/
const dev_createRegisteredUsers = (user_objList) => {
  return new Promise(async (resolve, reject) => {
    let user_arr = [];
    try {
      for (u of user_objList) {
        u.username = u.email.split("@")[0];
        const email_obj = {
          email: u.email,
          status: "registered",
        };
        const r = await User.create(u);
        await Email.create(email_obj);
        user_arr.push(r);
      }
    } catch (err) {
      return reject(err);
    }
    return resolve(user_arr);
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
  dev_createRegisteredUser,
  dev_createRegisteredUsers,
  dev_createDummyUserObj,
};
