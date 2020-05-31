require("../../src/db/mongoose");
const db = require("../../src/request/controller.js");
const rideDB = require("../../src/ride/controller.js");

const Request = require("../../src/request/request").Request;
const Ride = require("../../src/ride/ride").Ride;
const User = require("../../src/user/user").User;
const Noti = require("../../src/noti/noti").Noti;

const MY_RIDES_PATH = process.env.MY_RIDES_PATH;
const MY_DRIVES_PATH = process.env.MY_DRIVES_PATH;

describe("Testing request model controllers", () => {
  const curr_date = new Date();
  let future_date = new Date();
  future_date.setDate(future_date.getDate() + 100);
  const userObj_driver = {
    isRegistered: true,
    password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    username: "driver1",
    firstName: "Mike",
    email: "driver1-noreply@g.ucla.edu",
    picUrl:
      "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
  };
  const userObj_rider1 = {
    isRegistered: true,
    password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    username: "rider1",
    firstName: "Sarah",
    email: "rider2@g.ucla.edu",
    picUrl:
      "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
  };
  const userObj_rider2 = {
    isRegistered: true,
    password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    username: "rider2",
    firstName: "John",
    email: "rider2@g.ucla.edu",
    picUrl:
      "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_pink.png",
  };

  const rideObj_1 = {
    ownerUsername: userObj_driver.username,
    from: "Irvine",
    to: "Los Angeles",
    date: future_date.toDateString(),
    price: "20",
    seats: 4,
    detail: "driver1_future",
    passengers: [userObj_rider1.username],
  };

  beforeEach(async () => {
    await User.create(userObj_driver);
    await User.create(userObj_rider1);
    await User.create(userObj_rider2);

    return;
  });

  afterEach(async () => {
    await User.deleteMany();
    return;
  });

  describe("Testing Request Creation", () => {
    afterEach(async () => {
      await Ride.deleteMany();
      await Request.deleteMany();
      await Noti.deleteMany();
    });

    test("Request for that ride has already been made", async () => {
      const ride = await Ride.create(rideObj_1);
      const requestObj_rider2 = {
        rideID: ride._id,
        requesterUsername: "rider2",
        requesteeUsername: "driver1",
        date: new Date(),
      };
      try {
        await db.createRequest(requestObj_rider2);
        await db.createRequest(requestObj_rider2);
      } catch (err) {
        expect(err.message).toBe("A request has already been created for this ride");
      }
      const driverNotification = await Noti.findOne({
        username: requestObj_rider2.requesteeUsername,
      }).lean();
      expect(driverNotification).toEqual(
        expect.objectContaining({
          iconUrl: userObj_rider2.picUrl,
          msg: `${userObj_rider2.firstName} is requesting a spot on your trip from ${ride.from} to ${ride.to}`,
          redirectPath: MY_DRIVES_PATH,
        })
      );
    });
    test("Requester's already approved to be in the ride", async () => {
      const ride_1 = await Ride.create(rideObj_1);
      const requestObj_rider1 = {
        rideID: ride_1._id,
        requesterUsername: "rider1",
        requesteeUsername: "driver1",
        date: new Date(),
      };
      try {
        await db.createRequest(requestObj_rider1);
      } catch (err) {
        expect(err.message).toBe("The user is already in this ride");
      }
    });
    test("Driver cancels the ride while there are pending requests", async () => {
      const ride_1 = await Ride.create(rideObj_1);
      const requestObj_rider2 = {
        rideID: ride_1._id,
        requesterUsername: "rider2",
        requesteeUsername: "driver1",
        date: new Date(),
      };
      await db.createRequest(requestObj_rider2);
      let requestsInDB = await Request.find();
      expect(requestsInDB.length).toBe(1);

      await rideDB.cancelRide(ride_1._id, ride_1.ownerUsername, "", "");
      requestsInDB = await Request.find();
      expect(requestsInDB.length).toBe(0);

      const res_noti = await Noti.find();
      expect(res_noti.length).toBe(3);
    });
  });

  describe("Testing Status Update cases", () => {
    describe("Testing Request Approval", () => {
      afterEach(async () => {
        await Ride.deleteMany();
        await Request.deleteMany();
        await Noti.deleteMany();
      });

      test("Testing basic approval case", async () => {
        let ride_1 = await Ride.create(rideObj_1);
        const requestObj_rider2 = {
          rideID: ride_1._id,
          requesterUsername: "rider2",
          requesteeUsername: "driver1",
          date: new Date(),
        };
        let request_rider2 = await db.createRequest(requestObj_rider2);
        request_rider2 = await db.updateRequestStatus(
          request_rider2._id,
          request_rider2.requesteeUsername,
          "approved"
        );
        ride_1 = await Ride.findById(ride_1._id).lean();

        expect(request_rider2.status).toBe("approved");
        expect(ride_1.passengers.length).toBe(2);

        const approvalNoti = await Noti.findOne({ username: userObj_rider2.username }).lean();
        expect(approvalNoti).toEqual(
          expect.objectContaining({
            msg: `${userObj_driver.firstName} has accepted your ride request`,
            iconUrl: userObj_driver.picUrl,
            redirectPath: MY_RIDES_PATH,
          })
        );
      });

      test("Attempt to approve a request that's either archived or is not pending", async () => {
        let ride_1 = await Ride.create(rideObj_1);
        const requestObj_rider2 = {
          rideID: ride_1._id,
          requesterUsername: "rider2",
          requesteeUsername: "driver1",
          date: new Date(),
        };
        let request_rider2 = await db.createRequest(requestObj_rider2);
        request_rider2 = await db.updateRequestStatus(
          request_rider2._id,
          request_rider2.requesteeUsername,
          "denied"
        );

        try {
          await db.updateRequestStatus(
            request_rider2._id,
            request_rider2.requesteeUsername,
            "approved"
          );
        } catch (err) {
          expect(err.message).toBe("Ride has already been denied");
        }

        await db.archiveRequest(request_rider2._id);
        try {
          await db.updateRequestStatus(
            request_rider2._id,
            request_rider2.requesteeUsername,
            "approved"
          );
        } catch (err) {
          expect(err.message).toBe("Ride has already been archived");
        }
      });
    });

    describe("Testing Request Denial", () => {
      afterEach(async () => {
        await Ride.deleteMany();
        await Request.deleteMany();
        await Noti.deleteMany();
      });

      test("Testing basic denial case", async () => {
        let ride_1 = await Ride.create(rideObj_1);
        const requestObj_rider2 = {
          rideID: ride_1._id,
          requesterUsername: "rider2",
          requesteeUsername: "driver1",
          date: new Date(),
        };
        let request_rider2 = await db.createRequest(requestObj_rider2);
        request_rider2 = await db.updateRequestStatus(
          request_rider2._id,
          request_rider2.requesteeUsername,
          "denied"
        );
        ride_1 = await Ride.findById(ride_1._id).lean();

        expect(request_rider2.status).toBe("denied");
        expect(ride_1.passengers.length).toBe(1);

        const deniedNoti = await Noti.findOne({ username: userObj_rider2.username }).lean();
        expect(deniedNoti).toEqual(
          expect.objectContaining({
            msg: `Your request to join ${userObj_driver.firstName}'s ride has been denied`,
            iconUrl: userObj_driver.picUrl,
            redirectPath: MY_RIDES_PATH,
          })
        );
      });

      test("Attempt to deny a request that's either archived or is not pending", async () => {
        let ride_1 = await Ride.create(rideObj_1);
        const requestObj_rider2 = {
          rideID: ride_1._id,
          requesterUsername: "rider2",
          requesteeUsername: "driver1",
          date: new Date(),
        };
        let request_rider2 = await db.createRequest(requestObj_rider2);
        request_rider2 = await db.updateRequestStatus(
          request_rider2._id,
          request_rider2.requesteeUsername,
          "approved"
        );

        try {
          await db.updateRequestStatus(
            request_rider2._id,
            request_rider2.requesteeUsername,
            "denied"
          );
        } catch (err) {
          expect(err.message).toBe("Ride has already been approved");
        }

        await db.archiveRequest(request_rider2._id);
        try {
          await db.updateRequestStatus(
            request_rider2._id,
            request_rider2.requesteeUsername,
            "denied"
          );
        } catch (err) {
          expect(err.message).toBe("Ride has already been archived");
        }
      });
    });

    describe("Testing Request Cancellation", () => {
      afterEach(async () => {
        await Ride.deleteMany();
        await Request.deleteMany();
        await Noti.deleteMany();
      });

      test("Testing basic cancellation case", async () => {
        let ride_1 = await Ride.create(rideObj_1);
        const requestObj_rider2 = {
          rideID: ride_1._id,
          requesterUsername: "rider2",
          requesteeUsername: "driver1",
          date: new Date(),
        };
        let request_rider2 = await db.createRequest(requestObj_rider2);
        request_rider2 = await db.updateRequestStatus(
          request_rider2._id,
          request_rider2.requesterUsername,
          "cancelled"
        );

        expect(request_rider2.status).toBe("cancelled");
        expect(ride_1.passengers.length).toBe(1);

        const requestCancelledNoti = await Noti.findOne({
          username: userObj_driver.username,
          msg: `${userObj_rider2.firstName}'s request for your ride has been withdrawn`,
        }).lean();

        expect(requestCancelledNoti).toEqual(
          expect.objectContaining({
            iconUrl: userObj_rider2.picUrl,
            redirectPath: MY_DRIVES_PATH,
          })
        );
      });

      test("Attempt to cancel a request that's either archived or is not pending", async () => {
        let ride_1 = await Ride.create(rideObj_1);
        const requestObj_rider2 = {
          rideID: ride_1._id,
          requesterUsername: "rider2",
          requesteeUsername: "driver1",
          date: new Date(),
        };
        let request_rider2 = await db.createRequest(requestObj_rider2);

        try {
          await db.updateRequestStatus(
            request_rider2._id,
            request_rider2.requesterUsername,
            "cancelled"
          );
        } catch (err) {
          expect(err.message).toBe("Ride has already been denied");
        }

        await db.archiveRequest(request_rider2._id);
        try {
          await db.updateRequestStatus(
            request_rider2._id,
            request_rider2.requesterUsername,
            "cancelled"
          );
        } catch (err) {
          expect(err.message).toBe("Ride has already been archived");
        }
      });
    });
  });

  describe("Testing reminders", () => {
    afterEach(async () => {
      await Ride.deleteMany();
      await Request.deleteMany();
      await Noti.deleteMany();
    });
    test("Decrementing below zero", async () => {
      let ride_1 = await Ride.create(rideObj_1);
      const requestObj_rider2 = {
        rideID: ride_1._id,
        requesterUsername: "rider2",
        requesteeUsername: "driver1",
        date: new Date(),
      };
      let request_rider2 = await db.createRequest(requestObj_rider2);

      await db.decrementRemindCount(request_rider2._id, request_rider2.requesteeUsername);
      try {
        await db.decrementRemindCount(request_rider2._id, request_rider2.requesteeUsername);
      } catch (err) {
        expect(err.message).toBe("Reminder count is already less than 1");
      }
    });
  });
});
