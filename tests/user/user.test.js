require("../../src/db/mongoose");

const User = require("../../src/user/user").User;
const Email = require("../../src/user/email/email").Email;

const user_devCon = require("../../src/user/dev_controller");

const app = require("../../src/app");
const request = require("supertest");
const db = require("../../src/user/controller.js");
const db_email = require("../../src/user/email/controller.js");
const sha256 = require("sha256");
const jwt = require("jsonwebtoken");

describe("Testing the verification of an email", () => {
  afterEach(async () => {
    await User.deleteMany();
    await Email.deleteMany();
  });

  test("The email should be added to the database if a verified email does not already exist.", async () => {
    await db_email.sendVerificationEmail("unverifiedEmail@ucla.edu");
    const email_res = await Email.findOne({
      email: "unverifiedEmail@ucla.edu",
    }).lean();

    expect(email_res).toEqual(
      expect.objectContaining({
        email: "unverifiedEmail@ucla.edu",
        status: "pre-verification",
      })
    );
  });

  test("If a verified, but not registered email exists in the database, should return an error", async () => {
    const email = "verifiedEmail@g.ucla.edu";
    await db_email.sendVerificationEmail(email);
    await db_email.verifyEmail(email);
    try {
      await db_email.sendVerificationEmail(email);
    } catch (err) {
      expect(err.message).toBe("Email already verified");
    }
  });

  test("If a verified and registered user already has the same email that is being verified, should return an error", async () => {
    const verifiedUserObj = user_devCon.dev_createDummyUserObj("verfied");
    await user_devCon.dev_createRegisteredUser(verifiedUserObj);
    try {
      await db_email.verifyEmail(verifiedUserObj.email);
    } catch (err) {
      expect(err.message).toBe("The email is in registered status");
    }
  });

  test("When sending an GET request with the token of an unverified email to /users/verify to create a new account, should expect 302 redirection.", async () => {
    const email = "unverifiedEmail@ucla.edu";
    await db_email.sendVerificationEmail(email);
    const token = jwt.sign({ email: email }, process.env.JWT_EMAIL_KEY, {
      expiresIn: "24h",
    });
    await request(app).get("/users/verify").query({ token }).expect(302);
  });

  test("If the verification link is clicked after the email has been verified, but a user account is not registered for it, should expect 302 redirection", async () => {
    const email = "unverifiedEmail@ucla.edu";
    await db_email.sendVerificationEmail(email);
    const token = jwt.sign({ email: email }, process.env.JWT_EMAIL_KEY, {
      expiresIn: "24h",
    });
    await db_email.verifyEmail(email);
    await request(app).get("/users/verify").query({ token }).expect(302);
  });

  test("If the verification link is clicked after the email has been verified and the user account for it is registered, should expect an error", async () => {
    const verifiedUserObj = user_devCon.dev_createDummyUserObj("registered");
    await user_devCon.dev_createRegisteredUser(verifiedUserObj);
    const token = jwt.sign({ email: verifiedUserObj.email }, process.env.JWT_EMAIL_KEY, {
      expiresIn: "24h",
    });
    await request(app).get("/users/verify").query({ token }).expect(403);
  });

  test("If the verification link is asked to be resent over 10 times, returns an error", async () => {
    const email = "unverifiedEmail@ucla.edu";
    let i = 0;
    try {
      for (; i < 12; i++) {
        await db_email.sendVerificationEmail(email);
      }
    } catch (err) {
      expect(i).toBe(11);
      expect(err.message).toBe("Verification email resend limit reached");
    }
  });
});

describe("Testing the sign-up functionality after the email is verified", () => {
  // Create a user who has verified their email
  const verifiedEmail = new Email({
    email: "verifiedEmail@ucla.edu",
    status: "pre-registration",
  });

  beforeEach(async () => {
    await new Email(verifiedEmail).save();
  });

  afterEach(async () => {
    await User.deleteMany();
    await Email.deleteMany();
  });

  test("Expect an error if not all required properties are passed into signup", async () => {
    try {
      // Missing email property
      await db.signup({
        firstName: "John",
        lastName: "Smith",
        password: "password",
      });
    } catch (e) {
      expect(e.message).toBe("Not all required fields were specified.");
    }
  });

  test("Expect an error if an unverified email is passed into signup", async () => {
    try {
      await db.signup({
        firstName: "John",
        lastName: "Smith",
        password: "password",
        email: "unverifiedAccount@ucla.edu",
      });
    } catch (e) {
      expect(e.message).toBe("Email not verified");
    }
  });

  test("When signing up a new user, a new user should be added to the database with a firstName, username, hashed password, email, school, and isRegistered set to true.", async () => {
    const newUser = await db.signup({
      firstName: "John",
      lastName: "Smith",
      password: "password",
      email: verifiedEmail.email,
    });
    expect(newUser).toEqual(
      expect.objectContaining({
        firstName: "John",
        lastName: "Smith",
        username: "verifiedEmail",
        password: sha256("password"),
        email: "verifiedEmail@ucla.edu",
        school: "UCLA",
      })
    );
  });

  test("When sending an POST request with an unused username to /users/signup to create a new account, should expect 201 Created response.", async () => {
    await request(app)
      .post("/users/signup")
      .send({
        firstName: "John",
        lastName: "Smith",
        password: "password",
        email: verifiedEmail.email,
      })
      .expect(201);
  });
});

describe("Testing users with verified and registered accounts", () => {
  const registeredUser = {
    firstName: "John",
    lastName: "Smith",
    username: "registeredUser",
    password: sha256("password"),
    email: "registeredUser@g.ucla.edu",
    phoneNumber: "1231231234",
    aboutMe: "This was my old about me.",
  };

  const registeredUserUsernameAuthToken = jwt.sign(
    { username: registeredUser.username },
    process.env.JWT_SECRET_KEY
  );

  beforeEach(async () => {
    await user_devCon.dev_createRegisteredUsers([registeredUser]);
  });

  afterEach(async () => {
    await User.deleteMany();
    await Email.deleteMany();
  });

  describe("Testing signup/login/authentication functionality", () => {
    test("When logging in with an invalid password, should return an error.", async () => {
      try {
        expect.assertions(1);
        await db.login(registeredUser.email, sha256("invalid_password"));
      } catch (e) {
        expect(e.message).toBe("User with email and password not found.");
      }
    });

    test("When logging in with correct email and password credentials, should return true.", async () => {
      const validCredentials = await db.login(registeredUser.email, sha256("password"));
      const {
        firstName,
        lastName,
        username,
        password,
        email,
        phoneNumber,
        aboutMe,
      } = registeredUser;
      expect(validCredentials).toEqual(
        expect.objectContaining({
          firstName,
          lastName,
          username,
          password,
          email,
          phoneNumber,
          aboutMe,
        })
      );
    });

    test("When sending an POST request to /users/login for a user with invalid password, should expect a 401 authentication error response back.", async () => {
      await request(app)
        .post("/users/login")
        .send({
          email: registeredUser.email,
          password: "invalidPassword",
        })
        .expect(401);
    });

    test("When sending an POST request to /users/login for a user with a valid password, should expect 200 response with authentication token.", async () => {
      await request(app)
        .post("/users/login")
        .send({
          email: registeredUser.email,
          password: "password",
        })
        .expect(200);
    });

    test("When sending an POST request to /users/signup with a username that has been taken to create a new account, should expect 400 error response.", async () => {
      await request(app)
        .post("/users/signup")
        .send({
          username: registeredUser.username,
          password: "password",
          firstName: "John",
          lastName: "Smith",
        })
        .expect(400);
    });

    describe("Testing the validation of new account information during signup", () => {
      test("When a non-school email is used to sign-up, should result in an error", async () => {
        try {
          expect.assertions(1);
          await db_email.sendVerificationEmail("uniqueEmail@ucla.com");
        } catch (e) {
          expect(e.message).toBe("Not an .edu email address");
        }
      });

      test("When signing up using an email that already exists, should result in an error", async () => {
        try {
          expect.assertions(1);
          await db_email.sendVerificationEmail(registeredUser.email);
        } catch (e) {
          expect(e.message).toBe("Email already verified");
        }
      });

      test("When signing up using an improperly formatted email, should result in an error", async () => {
        try {
          expect.assertions(1);
          await db_email.sendVerificationEmail("notAValidEmail@", "validPassword123");
        } catch (e) {
          expect(e.message).toBe("Not a valid email address");
        }
      });

      test("When signing up using a properly formatted email that does not yet exist as a verified email, should result in the function returning true", async () => {
        expect(
          await db_email.sendVerificationEmail("unregisteredUnverifiedEmail@ucla.edu")
        ).toBeTruthy();
      });

      test("When signing up using a password that is less than eight characters long, should result in an error", async () => {
        try {
          expect.assertions(1);
          await db.isValidPassword("1234567");
        } catch (e) {
          expect(e.message).toBe("Password must be at least 8 characters long!");
        }
      });

      test("When signing up using a password that is at least eight characters long, should return true", async () => {
        expect(await db.isValidPassword("12345678")).toBeTruthy();
      });
    });
  });

  describe("Testing the retrieval of a user's average rating", () => {
    const testRevieweeUsername = "test_username";
    const test_reviewee = new User({
      username: testRevieweeUsername,
      rating: { sumOfAllRatings: 5, totalRatings: 2 },
    });

    beforeEach(async () => {
      await new User(test_reviewee).save();
    });
    afterEach(async () => {
      await User.deleteMany({});
    });

    describe("Test the retrieval of a user's average rating", () => {
      test("Correctly calculates the average rating of a user with 3 reviews.", async () => {
        const { sumOfAllRatings, totalRatings } = test_reviewee.rating;
        const expectedRating = (sumOfAllRatings / totalRatings).toFixed(2);
        return db.getAverageRating(testRevieweeUsername).then((rating) => {
          expect(rating).toBe(expectedRating);
        });
      });

      test("When requesting the average rating of a user that is in the database, should return 200 response code", async () => {
        await request(app)
          .get("/users/get-rating")
          .query({ username: testRevieweeUsername })
          .expect(200);
      });

      test("When requesting the average rating of a user that has no reviews, should return 404 response code", async () => {
        await request(app)
          .get("/users/get-rating")
          .query({ username: "does_not_exist" })
          .expect(404);
      });
    });
  });

  describe("Testing the retrieval of user account information", () => {
    test("When parsing an edu email, should return the school if it is in the database", async () => {
      const ucla1 = await db.parseSchoolFromEmail("bruin@g.ucla.edu");
      const ucla2 = await db.parseSchoolFromEmail("bruin@ucla.edu");
      const ucsb = await db.parseSchoolFromEmail("gaucho@ucsb.edu");
      expect(ucla1).toBe("UCLA");
      expect(ucla2).toBe("UCLA");
      expect(ucsb).toBe("UCSB");
    });

    test("When parsing an edu email not found in the database, should return null", async () => {
      const invalidSchool = await db.parseSchoolFromEmail("someStudent@fakeschool.edu");
      expect(invalidSchool).toEqual(null);
    });

    test("When parsing an invalid email domain, should return an error", async () => {
      try {
        expect.assertions(1);
        const invalidDomain = await db.parseSchoolFromEmail("someStudent@");
      } catch (e) {
        expect(e).toEqual("Could not parse email to identify school");
      }
    });

    test("When asking for a user's about me that doesn't exist, should return {} response", async () => {
      const user = await User.create({ username: "username" });
      const aboutMe = await db.getAboutMe(user.username);
      expect(aboutMe).not.toBeTruthy();
    });

    test("When sending an GET request to /users/get-about-me to a user without an aboutMe, should expect empty 200 response.", async () => {
      const user = await User.create({ username: "username" });
      await request(app)
        .get("/users/get-about-me")
        .query({ username: user.username })
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual({});
        });
    });

    test("When sending an GET request to /users/get-about-me to a user with an aboutMe, should expect 200 response.", async () => {
      await request(app)
        .get("/users/get-about-me")
        .query({ username: registeredUser.username })
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual({ aboutMe: "This was my old about me." });
        });
    });

    test("When updating a user's name or phone number, should set the corresponding user's name and phone number fields", (done) => {
      const updates = {
        phoneNumber: "1231231234",
        firstName: "John",
        lastName: "Smith",
      };
      db.updateUser(registeredUser.username, updates, (err, result) => {
        expect(result).toEqual(
          expect.objectContaining({
            phoneNumber: updates.phoneNumber,
            firstName: updates.firstName,
            lastName: updates.lastName,
          })
        );
        done();
      });
    });
  });

  describe("Testing uploading/retrieval of a user's profile picture", () => {
    test("When retrieving a user's profile pic url using an invalid username, the response should be an error", async () => {
      try {
        expect.assertions(1);
        await db.getPicUrl("invalidUsername");
      } catch (e) {
        expect(e.message).toEqual("username not found");
      }
    });

    test("When retrieving a user's profile pic url that has not been set, the response should be an error", async () => {
      try {
        expect.assertions(1);
        await db.getPicUrl(registeredUser.username);
      } catch (e) {
        expect(e.message).toEqual("user's profile picture undefined");
      }
    });

    test("When retrieving a user's profile pic url using a valid username, should receive it.", async () => {
      const { firstName, lastName, password, email, isRegistered } = registeredUser;
      const registeredUserWithProfilePic = new User({
        firstName,
        lastName,
        username: "registeredUserWithPicUrl",
        password,
        email,
        isRegistered,
        picUrl: "testUrl",
      });
      registeredUserWithProfilePic.save(async (err) => {
        const picURL = await db.getPicUrl(registeredUserWithProfilePic.username);
        expect(picURL).toEqual("testUrl");
      });
    });

    test("When sending a PATCH request to /users/upload-profile-pic with a valid PNG image, should expect 200 response and stored correct picUrl and picType", async () => {
      await request(app)
        .patch("/users/upload-profile-pic")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .attach("file", "./tests/user/test_profile.png")
        .expect(200)
        .then((res) => {
          expect(JSON.parse(res.text).picUrl).toEqual(
            "https://poolup-bucket-staging.s3.us-east-2.amazonaws.com/bucketFolder/registeredUser-pic.png"
          );
          expect(JSON.parse(res.text).picType).toEqual("png");
        });
    });

    test("When sending a PATCH request to /users/upload-profile-pic with a non-image file, should expect 400 error response.", async () => {
      await request(app)
        .patch("/users/upload-profile-pic")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .attach("file", "./tests/user/user.test.js") // improper image file
        .expect(400)
        .then((res) => {
          expect(res.text).toEqual("file type not allowed");
        });
    });

    test("When sending a GET request to /users/usersPic, should receive a 200 response with a url to the user's profile pic.", async () => {
      await User.deleteMany();
      registeredUser.picUrl =
        "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_blue.png";
      await new User(registeredUser).save();
      await request(app)
        .get("/users/usersPic")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .query({ username: registeredUser.username })
        .expect(200);
    });
  });

  describe("Testing validation of user properties, such as username or email", () => {
    test("When successfully confirming password credentials using a valid password during a user session, should return 200 response code", async () => {
      await request(app)
        .post("/users/checkCredentials")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .send({
          password: "password",
        })
        .expect(200);
    });

    test("When confirming password credentials using a valid password during a user session, should return 200 response code", async () => {
      await request(app)
        .post("/users/checkCredentials")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .send({
          password: "password",
        })
        .expect(200);
    });

    test("When confirming password credentials using an invalid password during a user session, should return 401 response code", async () => {
      await request(app)
        .post("/users/checkCredentials")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .send({
          password: "incorrectPassword",
        })
        .expect(401);
    });
  });

  describe("Testing update and deletion related operations", () => {
    test("When updating a user's about me, should properly update the aboutMe field", async () => {
      const updatedAboutMe = "This is a new about me description!";
      const userWithUpdatedAboutMe = await db.updateAboutMe(
        registeredUser.username,
        updatedAboutMe
      );
      expect(userWithUpdatedAboutMe.aboutMe).toBe(updatedAboutMe);
    });

    test("When updating the about me of a user who does not exist, should return an error message", async () => {
      try {
        await db.updateAboutMe("nonexistent_user", "Test about me description");
      } catch (e) {
        expect(e.message).toBe("Could not find user in database when updating about me.");
      }
    });

    test("When reseting a user's password, should update the user's password field to the new password.", (done) => {
      const newPassword = sha256("newPassword");
      db.passwordReset(registeredUser.username, newPassword, (err, result) => {
        expect(result).toEqual(
          expect.objectContaining({
            password: newPassword,
          })
        );
        done();
      });
    });

    test("When changing a user's password in an authorized session, should return 200 response code", async () => {
      await request(app)
        .patch("/users/changePassword")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .send({
          newPassword: "newPassword",
        })
        .expect(200);
    });

    test("When changing a user's password in an unauthorized session, should return 200 response code", async () => {
      await request(app)
        .patch("/users/changePassword")
        .set("Authorization", "Bearer WRONG_AUTHORIZATION_TOKEN")
        .send({
          newPassword: "newPassword",
        })
        .expect(401);
    });

    test("When sending a PATCH request to /users/updateUser with a new name, should receive a 200 response with the newly updated information", async () => {
      await request(app)
        .patch("/users/updateUser")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .send({
          firstName: "Evan",
          lastName: "Lin",
        })
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              firstName: "Evan",
              lastName: "Lin",
              phoneNumber: registeredUser.phoneNumber,
            })
          );
        });
    });

    test("When sending a PATCH request to /users/updateUser with a new name, should receive a 200 response with the newly updated information", async () => {
      await request(app)
        .patch("/users/updateUser")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .send({
          firstName: "Evan",
          lastName: "Lin",
        })
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              firstName: "Evan",
              lastName: "Lin",
              phoneNumber: registeredUser.phoneNumber,
            })
          );
        });
    });

    test("When sending a PATCH request to /users/updateUser with a new phone number, should receive a 200 response with the newly updated information", async () => {
      await request(app)
        .patch("/users/updateUser")
        .set("Authorization", "Bearer " + registeredUserUsernameAuthToken)
        .send({
          phoneNumber: "1111111111",
        })
        .expect(200)
        .then((res) => {
          expect(res.body).toEqual(
            expect.objectContaining({
              firstName: registeredUser.firstName,
              lastName: registeredUser.lastName,
              phoneNumber: "1111111111",
            })
          );
        });
    });
  });
});
