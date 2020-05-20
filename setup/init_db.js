require("../src/db/mongoose");
const chalk = require("chalk");

const User = require("../src/user/user").User;
const Email = require("../src/user/email/email").Email;
const Ride = require("../src/ride/ride.js").Ride;
const Noti = require("../src/noti/noti").Noti;
const School = require("../src/school/school.js").School;

const devCon = require("../src/user/dev_controller");

const MY_DRIVES_PATH = process.env.MY_DRIVES_PATH;
const MY_RIDES_PATH = process.env.MY_RIDES_PATH;

const curr_date = new Date();
let future_date_1 = new Date();
future_date_1.setDate(curr_date.getDate() + 2);
let future_date_2 = new Date();
future_date_2.setDate(curr_date.getDate() + 3);
let past_date = new Date();
past_date.setDate(curr_date.getDate() - 2);

const user_list = [
  {
    isRegistered: true,
    password:
      "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    username: "admin",
    firstName: "adminFirstName",
    lastName: "adminLastName",
    email: "admin-noreply@g.ucla.edu",
    picUrl:
      "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
  },
  {
    isRegistered: true,
    password:
      "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    username: "user1",
    firstName: "user1FirstName",
    lastName: "user1LastName",
    email: "user1@g.ucla.edu",
    picUrl:
      "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
  },
  {
    isRegistered: true,
    password:
      "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    username: "user2",
    firstName: "user2FirstName",
    lastName: "user2LastName",
    email: "user2@g.ucla.edu",
    picUrl:
      "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_pink.png",
  },
  {
    isRegistered: true,
    password:
      "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    username: "user3",
    firstName: "user3FirstName",
    lastName: "user3LastName",
    email: "user3@g.ucla.edu",
    picUrl:
      "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_purple.png",
  },
  {
    isRegistered: true,
    password:
      "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    username: "user4",
    firstName: "user4FirstName",
    lastName: "user4LastName",
    email: "user4@g.ucla.edu",
    picUrl:
      "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_blue.png",
  },
];
const ride_list = [
  // user1's upcoming drive
  {
    ownerEmail: "user1@g.ucla.edu",
    ownerUsername: "user1",
    ownerPhoneNumber: "1231231234",
    from: "Irvine",
    to: "Los Angeles",
    date: future_date_1.toDateString(),
    price: "20",
    seats: 4,
    detail: "driver1_future",
    passengers: ["user2"],
  },
  // user1's previous drive
  {
    ownerEmail: "user1@g.ucla.edu",
    ownerUsername: "user1",
    ownerPhoneNumber: "1231231234",
    from: "Irvine",
    to: "Los Angeles",
    date: past_date.toDateString(),
    price: "20",
    seats: 4,
    detail: "driver1_history",
    passengers: ["user2"],
  },
  // user1's planned ride (approved)
  {
    ownerEmail: "user4@g.ucla.edu",
    ownerUsername: "user4",
    ownerPhoneNumber: "1231231234",
    from: "Los Angeles",
    to: "Irvine",
    date: future_date_1.toDateString(),
    price: "20",
    seats: 4,
    detail: "rider1_future",
    passengers: ["user1"],
  },
  // user1's planned ride (pending)
  {
    ownerEmail: "user4@g.ucla.edu",
    ownerUsername: "user4",
    ownerPhoneNumber: "1231231234",
    from: "Los Angeles",
    to: "Irvine",
    date: future_date_2.toDateString(),
    price: "20",
    seats: 4,
    detail: "rider1_future",
    passengers: [],
  },
];
const noti_list = [
  {
    username: "user1",
    msg: `user2 is requesting a spot on your trip from Irvine to Los Angeles`,
    date: past_date.toDateString(),
    redirectPath: MY_DRIVES_PATH,
  },
  {
    username: "user1",
    msg: `user2 is requesting a spot on your trip from Irvine to Los Angeles`,
    date: curr_date.toDateString(),
    redirectPath: MY_DRIVES_PATH,
  },
  {
    username: "user1",
    msg: `user3 is requesting a spot on your trip from Irvine to Los Angeles`,
    date: curr_date.toDateString(),
    redirectPath: MY_DRIVES_PATH,
  },
  {
    username: "user1",
    msg: `user4 has accepted your ride request`,
    date: curr_date.toDateString(),
    redirectPath: MY_RIDES_PATH,
  },
];

const school_list = [
  { emailDomain: "ucla", school: "UCLA" },
  { emailDomain: "ucsb", school: "UCSB" },
];

// User Seed
const userSeed = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await User.deleteMany();
      await Email.deleteMany();
      await devCon.dev_createRegisteredUsers(user_list);
      // await User.insertMany(user_list);
    } catch (err) {
      console.log(err);
      return reject();
    }
    console.log(
      chalk.green("[DB_INIT]: ") +
        "Successfully initialized development database - User!"
    );
    return resolve();
  });
};

// Email Seed
const emailSeed = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await Email.deleteMany();
      for (u of user_list) {
        const email_obj = {
          email: u.email,
          status: "registered",
        };
        Email.create(email_obj);
      }
    } catch (err) {
      console.log(err);
      return reject();
    }
    console.log(
      chalk.green("[DB_INIT]: ") +
        "Successfully initialized development database - Email!"
    );
    return resolve();
  });
};

// Ride Seed
const rideSeed = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await Ride.deleteMany({});
      await Ride.insertMany(ride_list);
    } catch (err) {
      console.log(err);
      return reject();
    }
    console.log(
      chalk.green("[DB_INIT]: ") +
        "Successfully initialized development database - Ride!"
    );
    return resolve();
  });
};

// Notification Seed
const notificationSeed = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await Noti.deleteMany({});
      await Noti.insertMany(noti_list);
    } catch (err) {
      console.log(err);
      return reject();
    }
    console.log(
      chalk.green("[DB_INIT]: ") +
        "Successfully initialized development database - Noti!"
    );
    return resolve();
  });
};

// Seed schools collection used to parse emails for the school the user attends
const schoolSeed = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await School.deleteMany({});
      await School.insertMany(school_list);
    } catch (err) {
      console.log(err);
      return reject();
    }
    console.log(
      chalk.green("[DB_INIT]: ") +
        "Successfully initialized development database - School!"
    );
    return resolve();
  });
};

const seed = async () => {
  try {
    await userSeed();
    await emailSeed();
    await rideSeed();
    await notificationSeed();
    await schoolSeed();
    process.exit(0);
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

seed();
