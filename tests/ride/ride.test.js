require("../../src/db/mongoose");
const User = require("../../src/user/user").User;
const Ride = require("../../src/ride/ride").Ride;
const Noti = require("../../src/noti/noti").Noti;
const Email = require("../../src/user/email/email").Email;
const user_devCon = require("../../src/user/dev_controller");
const app = require("../../src/app");
const request = require("supertest");
const db = require("../../src/ride/controller.js");
const jwt = require("jsonwebtoken");

describe("Testing Ride endpoints", () => {
  describe("Testing ride posting", () => {
    let sampleRide = {
      ownerEmail: "idc@gmail.com",
      ownerUsername: "",
      from: "Here",
      to: "There",
      date: new Date(),
      price: "20",
      seats: 4,
      detail: "Third test for post",
      passengers: [],
    };

    afterEach(async () => {
      await Ride.deleteMany({});
      await User.deleteMany({});
      await Noti.deleteMany({});
      await Email.deleteMany({});
    });

    // Can't post a ride with different username in rideInfo and authUsername
    test("Can't post a ride with different username in rideInfo and authUsername", async () => {
      const user_obj = user_devCon.dev_createDummyUserObj("driver");
      const user = user_devCon.dev_createRegisteredUsers([user_obj]);
      // const username = "driver";
      // await User.create({ username: username });
      let ride = sampleRide;
      ride.ownerUsername = "bogusUsername";
      // const newRide = await db.postRide(ride, username);

      const userAuthToken = jwt.sign(
        { username: user.username, _id: user._id },
        process.env.JWT_SECRET_KEY
      );

      await request(app)
        .post("/rides/post-ride")
        .send({ rideInfo: ride })
        .set("Authorization", "Bearer " + userAuthToken)
        .expect(403);
    });
  });

  describe("Testing when a user joins a ride", () => {
    let sampleRide = {
      ownerEmail: "idc@gmail.com",
      ownerUsername: "",
      from: "Here",
      to: "There",
      date: new Date(),
      price: "20",
      seats: 4,
      detail: "Third test for post",
      passengers: [],
    };

    afterEach(async () => {
      await Ride.deleteMany({});
      await User.deleteMany({});
      await Noti.deleteMany({});
      await Email.deleteMany({});
    });

    test("Expect when a user joins a ride, the user is added to the ride's list of passengers, the number of seats is decremented, and a notification is sent to the driver", async () => {
      const passenger = await User.create({ username: "passenger_2" });
      const ownerUsername = "driverUsername";
      let ride = await Ride.create({
        ownerUsername,
        passengers: ["passenger_1"],
        seats: 2,
      });
      const res = await db.joinRide(ride, passenger.username);
      expect(Array.from(res.passengers).sort()).toEqual([
        "passenger_1",
        "passenger_2",
      ]);
      expect(res.seats).toBe(1);
      expect(await Noti.findOne({ username: ownerUsername }).lean()).toEqual(
        expect.objectContaining({
          username: ownerUsername,
          msg: "passenger_2 has joined your ride",
        })
      );
    });

    test("The Driver can't join his own ride", async () => {
      const username = "driver";
      await User.create({ username: username });
      let ride = sampleRide;
      ride.ownerUsername = username;
      const newRide = await db.postRide(ride, username);
      try {
        await db.joinRide(newRide, username);
      } catch (err) {
        expect(err.message).toBe("driver of the ride cannot join the ride");
      }
    });

    // ride is full
    test("The ride is full", async () => {
      const username = "rider";
      let ride = sampleRide;
      ride.ownerUsername = username;
      const newRide = await db.postRide(ride, username);
      let i = 0;
      try {
        for (; i < newRide.seats + 3; i++) {
          const username_ = username + i;
          const user = await User.create({ username: username_ });
          await db.joinRide(newRide, user.username);
        }
      } catch (err) {
        expect(i).toBe(newRide.seats);
        expect(err.message).toBe("the ride is full");
      }
    });
  });

  describe("Testing cancellation of rides", () => {
    afterEach(async () => {
      await Ride.deleteMany({});
      await User.deleteMany({});
      await Noti.deleteMany({});
      await Email.deleteMany({});
    });

    test("Test cancellation of a ride with passengers as a driver", async () => {
      const driver = await User.create({
        username: "driverUsername",
        email: "driverUsername@ucla.edu",
      });
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1", "passenger2"],
      });

      await db.cancelRide(ride._id, "driverUsername", "No longer traveling");

      // Check whether ride was deleted
      const cancelledRide = await Ride.findOne({
        ownerUsername: ride.ownerUsername,
      });
      expect(cancelledRide).toBe(null);

      // Check incrementation of cancelled rides
      const user = await User.findOne({ username: driver.username });
      expect(user.ridesCancelled).toBe(1);

      // Check creation of notification to each passenger with expected properties
      const noti1 = await Noti.findOne({ username: "passenger1" });
      expect(noti1).toEqual(
        expect.objectContaining({
          username: "passenger1",
          msg: "driverUsername has cancelled your ride",
        })
      );
      expect(noti1.additionalProperties).toEqual({
        cancellationReason: "No longer traveling",
      });

      const noti2 = await Noti.findOne({ username: "passenger2" });
      expect(noti2).toEqual(
        expect.objectContaining({
          username: "passenger2",
          msg: "driverUsername has cancelled your ride",
        })
      );
      expect(noti1.additionalProperties).toEqual({
        cancellationReason: "No longer traveling",
      });
    });

    test("Test cancellation of a ride without passengers as a driver", async () => {
      const driver = await User.create({
        username: "driverUsername",
        email: "driverUsername@ucla.edu",
      });
      const ride = await Ride.create({ ownerUsername: "driverUsername" });

      await db.cancelRide(ride._id, "driverUsername");

      // Check whether ride was deleted
      const cancelledRide = await Ride.findOne({
        ownerUsername: ride.ownerUsername,
      });
      expect(cancelledRide).toBe(null);
    });

    test("Test cancellation of a ride as a passenger", async () => {
      const passenger = await User.create({
        username: "passenger1",
        email: "passenger1@ucla.edu",
      });
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1", "passenger2"],
        seats: 0,
      });
      await db.cancelRide(
        ride._id,
        "passenger1",
        "Other",
        "Sorry I can't make it!!!"
      );

      // Check whether a notification was sent to the driver
      const driverNoti = await Noti.findOne({ username: "driverUsername" });
      expect(driverNoti).toEqual(
        expect.objectContaining({
          username: "driverUsername",
          msg: "passenger1 has cancelled your ride",
        })
      );
      expect(driverNoti.additionalProperties).toEqual({
        cancellationReason: "Other",
        messageToDriver: "Sorry I can't make it!!!",
      });

      // Check whether passenger was removed from ride
      const cancelledRide = await Ride.findOne({
        ownerUsername: ride.ownerUsername,
      }).lean();
      expect(cancelledRide.seats).toBe(1);
      expect(cancelledRide.passengers).toEqual(["passenger2"]);

      // Check incrementation of cancelled rides
      const user = await User.findOne({ username: passenger.username });
      expect(user.ridesCancelled).toBe(1);
    });

    test("Test error when trying to cancel a ride that the user does not belong to", async () => {
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1"],
        seats: 1,
      });
      expect.assertions(1);
      try {
        await db.cancelRide(ride._id, "userNotInRide");
      } catch (e) {
        expect(e).toBeTruthy();
      }
    });

    test("Expect a response code of 200 when cancelling a ride as a passenger.", async () => {
      const passenger_obj = user_devCon.dev_createDummyUserObj("passenger1");
      const passenger = await user_devCon.dev_createRegisteredUser(
        passenger_obj
      );

      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1"],
        seats: 1,
      });

      const authToken = jwt.sign(
        { username: passenger.username, _id: passenger._id },
        process.env.JWT_SECRET_KEY
      );
      await request(app)
        .put("/rides/cancel-ride")
        .set("Authorization", "Bearer " + authToken)
        .send({
          cancellationReason: "Change of travel plans",
          messageToDriver: "I'm so sorry for cancelling on you! :(",
          ride,
        })
        .expect(200);
    });

    test("Expect a response code of 200 when cancelling a ride as a passenger.", async () => {
      const driver_obj = user_devCon.dev_createDummyUserObj("driverUsername");
      const driver = user_devCon.dev_createRegisteredUsers([driver_obj]);
      // const driver = await User.create({
      //   username: "driverUsername",
      //   email: "driver@ucla.edu",
      // });
      const ride = await Ride.create({
        ownerUsername: driver.username,
        passengers: ["passenger1"],
        seats: 1,
      });
      const authToken = jwt.sign(
        { username: driver.username, _id: driver._id },
        process.env.JWT_SECRET_KEY
      );

      await request(app)
        .put("/rides/cancel-ride")
        .set("Authorization", "Bearer " + authToken)
        .send({ cancellationReason: "Change of travel plans", ride })
        .expect(200);
    });
  });
});
