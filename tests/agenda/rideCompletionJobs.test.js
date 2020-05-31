require("../../src/db/mongoose");
const MongoClient = require("mongodb");
const User = require("../../src/user/user").User;
const Ride = require("../../src/ride/ride").Ride;
const Noti = require("../../src/noti/noti").Noti;
const Review = require("../../src/review/review").Review;
const RideCompletionJobs = require("../../src/agenda/jobs/rideCompletionJobs");
const agenda = require("../../src/agenda/agenda");

let mongoDb = null;
let mongoClient = null;

describe("Testing the implementation of scheduled jobs that occur after a ride is completed.", () => {
  // Opening up a connection to the test database to clear the "scheduledJobs" collection
  beforeAll(async () => {
    mongoClient = await MongoClient.connect(process.env.MONGODB_URL, {
      useUnifiedTopology: true,
    });
    mongoDb = mongoClient.db(process.env.MONGODB_URL.split("/").pop());
  });

  afterAll(async () => {
    await mongoClient.close();
  });

  // Delete all scheduled jobs in the database
  afterEach(async () => {
    await mongoDb.collection("scheduledJobs").deleteMany({});
  });

  describe("Testing the update completed rides scheduled task", () => {
    afterEach(async () => {
      await Ride.deleteMany({});
      await User.deleteMany({});
    });
    test("Expect no updates to completed rides if there are no passengers in the ride", async () => {
      let driver = await User.create({ username: "driverUsername" });
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: [],
        seats: 0,
      });

      await RideCompletionJobs.updateCompletedRidesTask(ride._id);
      driver = await User.findOne({ username: "driverUsername" });
      expect(driver.ridesCompleted).toBe(0);
    });

    test("Expect driver receives a completed ride for each passenger, and each passenger receives one completed ride", async () => {
      let driver = await User.create({ username: "driverUsername" });
      let passenger1 = await User.create({ username: "passenger1" });
      let passenger2 = await User.create({ username: "passenger2" });
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["passenger1", "passenger2"],
        seats: 0,
      });

      await RideCompletionJobs.updateCompletedRidesTask(ride._id);
      driver = await User.findOne({ username: driver.username });
      passenger1 = await User.findOne({ username: passenger1.username });
      passenger2 = await User.findOne({ username: passenger2.username });
      expect(driver.ridesCompleted).toBe(2);
      expect(passenger1.ridesCompleted).toBe(1);
      expect(passenger2.ridesCompleted).toBe(1);
    });

    describe("Testing review notification message formatting helper function", () => {
      test("Testing message to leave a review for a single passenger", async () => {
        expect(await RideCompletionJobs.formatPassengerReviewMessage(["Sarah"])).toBe(
          "Leave a review for your passenger, Sarah."
        );
      });
      test("Testing message to leave a review for two passengers", async () => {
        expect(await RideCompletionJobs.formatPassengerReviewMessage(["Sarah", "Mike"])).toBe(
          "Leave a review for your passengers, Sarah and Mike."
        );
      });
      test("Testing message to leave a review for three passengers", async () => {
        expect(
          await RideCompletionJobs.formatPassengerReviewMessage(["Sarah", "Mike", "Sammy"])
        ).toBe("Leave a review for your passengers, Sarah, Mike, and Sammy.");
      });
    });

    describe("Testing leave a review notification", () => {
      afterEach(async () => {
        await Ride.deleteMany({});
        await User.deleteMany({});
        await Noti.deleteMany({});
        await Review.deleteMany({});
      });
      test("Testing whether drivers and passengers receive proper notifications to leave a review", async () => {
        let driver = await User.create({
          firstName: "Sarah",
          username: "driverUsername",
          picUrl: "driver_pic.png",
        });
        let passenger1 = await User.create({
          firstName: "John",
          username: "passenger1",
          picUrl: "passenger1_pic.png",
        });
        let passenger2 = await User.create({
          firstName: "Aiden",
          username: "passenger2",
          picUrl: "passenger2_pic.png",
        });
        const ride = await Ride.create({
          ownerUsername: "driverUsername",
          passengers: ["passenger1", "passenger2"],
          seats: 0,
        });
        await RideCompletionJobs.createNotiToLeaveReviewTask(ride._id);

        const driverNoti = await Noti.findOne({ username: ride.ownerUsername });
        expect(driverNoti).toEqual(
          expect.objectContaining({
            username: driver.username,
            iconUrl: passenger1.picUrl,
            msg: "Leave a review for your passengers, John and Aiden.",
          })
        );
        // Check additional properties in the driver notification
        expect(driverNoti.additionalProperties.rideId.toString()).toBe(ride._id.toString());
        expect(driverNoti.additionalProperties.usersToReview).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              username: passenger1.username,
              firstName: passenger1.firstName,
              picUrl: passenger1.picUrl,
            }),
            expect.objectContaining({
              username: passenger2.username,
              firstName: passenger2.firstName,
              picUrl: passenger2.picUrl,
            }),
          ])
        );

        const passenger1Noti = await Noti.findOne({
          username: passenger1.username,
        });
        expect(passenger1Noti).toEqual(
          expect.objectContaining({
            username: passenger1.username,
            iconUrl: driver.picUrl,
            msg: "Leave a review for your driver, Sarah.",
          })
        );
        // Check additional properties in passenger one's notification
        expect(passenger1Noti.additionalProperties.rideId.toString()).toBe(ride._id.toString());
        expect(passenger1Noti.additionalProperties.usersToReview).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              username: driver.username,
              firstName: driver.firstName,
              picUrl: driver.picUrl,
            }),
          ])
        );

        const passenger2Noti = await Noti.findOne({
          username: passenger2.username,
        });
        expect(passenger2Noti).toEqual(
          expect.objectContaining({
            username: passenger2.username,
            iconUrl: driver.picUrl,
            msg: "Leave a review for your driver, Sarah.",
          })
        );
        // Check additional properties in passenger one's notification
        expect(passenger2Noti.additionalProperties.rideId.toString()).toBe(ride._id.toString());
        expect(passenger2Noti.additionalProperties.usersToReview).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              username: driver.username,
              firstName: driver.firstName,
              picUrl: driver.picUrl,
            }),
          ])
        );
      });

      test("Testing whether an expiry task is created for every review that can be sent out", async () => {
        let driver = await User.create({
          firstName: "Sarah",
          username: "driverUsername",
        });
        let passenger1 = await User.create({
          firstName: "John",
          username: "passenger1",
        });
        let passenger2 = await User.create({
          firstName: "Aiden",
          username: "passenger2",
        });
        const ride = await Ride.create({
          ownerUsername: "driverUsername",
          passengers: ["passenger1", "passenger2"],
          seats: 0,
        });
        await RideCompletionJobs.createNotiToLeaveReviewTask(ride._id);

        let scheduledJobs = await agenda.jobs({
          data: {
            rideId: ride._id,
            driverUsername: driver.username,
            passengerUsername: passenger1.username,
          },
        });
        expect(scheduledJobs.length).toBe(1);
        expect(scheduledJobs[0].attrs.name).toEqual("expire ability to leave review");

        scheduledJobs = await agenda.jobs({
          data: {
            rideId: ride._id,
            driverUsername: driver.username,
            passengerUsername: passenger2.username,
          },
        });
        expect(scheduledJobs.length).toBe(1);
        expect(scheduledJobs[0].attrs.name).toEqual("expire ability to leave review");
      });

      test("Testing that a review should be made public if one exists before the time for leaving a review expires", async () => {
        // Passenger with a 5.0 rating over two reviews
        let passenger1 = await User.create({
          username: "passenger1",
          rating: { sumOfAllRatings: 10, totalRatings: 2 },
        });
        const ride = await Ride.create({
          ownerUsername: "driverUsername",
          passengers: ["passenger1", "passenger2"],
          seats: 0,
        });
        // Unpublished review because counterpart has not submitted their review yet, should be published after ability for counterpart to leave review expires
        const review = await Review.create({
          rideId: ride._id,
          reviewerUsername: "driverUsername",
          revieweeUsername: "passenger1",
          isPublished: false,
          rating: 4,
        });

        await RideCompletionJobs.expireAbilityToLeaveReviewTask(
          ride._id,
          review.reviewerUsername,
          review.revieweeUsername
        );

        expect((await Review.findById(review._id)).isPublished).toBe(true);
        expect((await User.findById(passenger1._id)).rating.sumOfAllRatings).toBe(14);
        expect((await User.findById(passenger1._id)).rating.totalRatings).toBe(3);
      });

      test("Testing that reviews can no longer be made if a user does not leave a review before the ability to leave a review expires", async () => {
        const ride = await Ride.create({
          ownerUsername: "driverUsername",
          passengers: ["passenger1", "passenger2"],
          seats: 0,
        });
        await RideCompletionJobs.expireAbilityToLeaveReviewTask(
          ride._id,
          "driverUsername",
          "passenger1"
        );
        expect(
          (
            await Review.findOne({
              rideId: ride._id,
              reviewerUsername: "driverUsername",
              revieweeUsername: "passenger1",
            })
          ).isDeclined
        ).toBe(true);
      });
    });
  });
});
