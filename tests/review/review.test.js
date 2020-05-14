const mongoose = require("mongoose");
// initialize testing database
require("../../src/db/mongoose");
const db = require("../../src/review/controller");
const Review = require("../../src/review/review").Review;
const Ride = require("../../src/ride/ride").Ride;
const User = require("../../src/user/user").User;
const jwt = require("jsonwebtoken");
const agenda = require("../../src/agenda/agenda");

const app = require("../../src/app");
const request = require("supertest");

describe("Testing rating system operations", () => {
  const testRevieweeUsername = "test_reviewee";
  const testReview1 = new Review({
    reviewerUsername: "test_reviewer_1",
    revieweeUsername: testRevieweeUsername,
    rating: 1,
    datePosted: new Date("Jan 1, 2020"),
    isPublished: true,
  });
  const testReview2 = new Review({
    reviewerUsername: "test_reviewer_2",
    revieweeUsername: testRevieweeUsername,
    rating: 2,
    datePosted: new Date("Jan 2, 2020"),
    isPublished: true,
  });
  const testReview3 = new Review({
    reviewerUsername: "test_reviewer_3",
    revieweeUsername: testRevieweeUsername,
    rating: 3,
    datePosted: new Date("Jan 3, 2020"),
    isPublished: true,
  });

  beforeEach(async () => {
    await new Review(testReview1).save();
    await new Review(testReview2).save();
    return await new Review(testReview3).save();
  });

  afterEach(() => {
    return Review.deleteMany();
  });

  describe("Test the retrieval of all of a user's reviews", () => {
    test("Get all of the reviews for a user who has at least one review.", () => {
      const expectedReviews = [
        testReview3.reviewerUsername,
        testReview2.reviewerUsername,
        testReview1.reviewerUsername,
      ];
      return db.getUserReviews(testRevieweeUsername, 0).then((reviews) => {
        expect(reviews.map((a) => a.reviewerUsername)).toStrictEqual(
          expectedReviews
        );
      });
    });

    test("Get all of the reviews for a user who has 0 reviews.", () => {
      return db
        .getUserReviews("user_that_does_not_exist", 0)
        .then((reviews) => {
          expect(reviews.length).toBe(0);
        });
    });

    test("When retrieving all reviews for a user who with only a declined review, should return []", async () => {
      const declinedReview = await new Review({
        revieweeUsername: "user_with_only_declined_reviews",
        reviewerUsername: "user_who_did_not_choose_to_review",
        isDeclined: true,
      });
      return db
        .getUserReviews("user_with_only_declined_reviews", 0)
        .then((reviews) => {
          expect(reviews.length).toBe(0);
        });
    });

    test("Get the 6th review from a user who has more than 5 reviews (retrieval with pagination)", async () => {
      try {
        await Review.create({
          reviewerUsername: "test_reviewer_4",
          revieweeUsername: testRevieweeUsername,
          rating: 3,
          datePosted: new Date("Jan 4, 2020"),
          isPublished: true,
        });
        await Review.create({
          reviewerUsername: "test_reviewer_5",
          revieweeUsername: testRevieweeUsername,
          rating: 3,
          datePosted: new Date("Jan 5, 2020"),
          isPublished: true,
        });
        const sixth_review = await Review.create({
          reviewerUsername: "test_reviewer_6",
          revieweeUsername: testRevieweeUsername,
          rating: 3,
          datePosted: new Date("Jan 6, 2020"),
          isPublished: true,
        });
        return db.getUserReviews(testRevieweeUsername, 1).then((reviews) => {
          expect(reviews.length).toBe(1);
          expect(reviews[0]._id).toEqual(testReview1._id);
        });
      } catch (e) {
        console.log(e);
      }
    });

    test("Expect non-publically published reviews made to a user to not be returned.", async () => {
      const publishedReview = await Review.create({
        reviewerUsername: "test_reviewer_1",
        revieweeUsername: "test_reviewee_1",
        rating: 4,
        datePosted: new Date("Jan 4, 2020"),
        isPublished: true,
      });
      const unpublishedReview = await Review.create({
        reviewerUsername: "test_reviewer_2",
        revieweeUsername: "test_reviewee_1",
        rating: 3,
        datePosted: new Date("Jan 4, 2020"),
        isPublished: false,
      });
      const reviews = await db.getUserReviews("test_reviewee_1", 0);
      expect(reviews.length).toBe(1);
      expect(reviews[0]._id).toEqual(publishedReview._id);
    });
  });

  describe("Test operation to add a review to the database", () => {
    afterEach(async () => {
      await User.deleteMany();
      await Review.deleteMany();
      await Ride.deleteMany();
    });

    test("A review without a required field, such as rideId, should error instead of creating the review.", async () => {
      try {
        await db.addNewReview({
          reviewerUsername: "reviewer",
          revieweeUsername: "reviewee",
          rating: 2,
        });
      } catch (e) {
        expect(e.message).toMatch(
          "Review must contain a reviewer username, reviewee username, rating, and associated ride ID"
        );
      }
    });

    test("When a user submits a review before his counterpart has, expect a new review document to be created but not published and the reviewee should not have their rating changed yet.", async () => {
      try {
        const revieweeUsername = "reviewee";

        // Create a dummy user who receives the new review
        const userWhoReceivesReview = await User.create({
          username: revieweeUsername,
        });
        const reviewInfo = {
          reviewerUsername: "reviewer",
          revieweeUsername,
          rating: 2,
          rideId: mongoose.Types.ObjectId(),
        };
        const newReview = await db.addNewReview(reviewInfo);
        const { reviewerUsername, rating, rideId } = reviewInfo;
        expect(newReview).toStrictEqual(
          expect.objectContaining({
            reviewerUsername,
            revieweeUsername,
            rating,
            rideId,
            isPublished: false,
          })
        );

        // Check that the rating field is unchanged
        User.findOne({ username: revieweeUsername }, (err, user) => {
          expect(user.rating.totalRatings).toBe(0);
          expect(user.rating.sumOfAllRatings).toBe(0);
        });
      } catch (e) {
        console.log(e);
      }
    });

    test("When a user submits a review after his counterpart has, expect both reviews to be published and both ratings updated. The `expire ability to leave review` job should be cancelled.", async () => {
      // Create a dummy user who receives the new review
      let firstReviewer = await User.create({ username: "driverUsername" });
      let secondReviewer = await User.create({ username: "riderUsername" });
      const ride = await Ride.create({
        ownerUsername: "driverUsername",
        passengers: ["riderUsername"],
      });

      // "Expire ability to leave review" job associated with this driver->passenger pair should already exist
      // It should be cancelled after adding the new review because the reviewer's counterpart has left a review already
      await agenda.schedule("24 hours", "expire ability to leave review", {
        rideId: ride._id,
        driverUsername: ride.ownerUsername,
        passengerUsername: "riderUsername",
      });
      let expireReviewNotiJob = await agenda.jobs({
        name: "expire ability to leave review",
        data: {
          rideId: ride._id,
          driverUsername: ride.ownerUsername,
          passengerUsername: "riderUsername",
        },
      });
      expect(expireReviewNotiJob.length).toBe(1);

      // Counterpart review
      let firstReview = await Review.create({
        reviewerUsername: firstReviewer.username,
        revieweeUsername: secondReviewer.username,
        rating: 3,
        rideId: ride._id,
      });

      let secondReview = await db.addNewReview({
        reviewerUsername: secondReviewer.username,
        revieweeUsername: firstReviewer.username,
        rating: 4,
        rideId: ride._id,
      });

      // Cancelled the job
      expireReviewNotiJob = await agenda.jobs({
        name: "expire ability to leave review",
        data: {
          rideId: ride._id,
          driverUsername: ride.ownerUsername,
          passengerUsername: "riderUsername",
        },
      });
      expect(expireReviewNotiJob.length).toBe(0);

      // Expect both reviews are published
      firstReview = await Review.findOne({
        rideId: ride._id,
        reviewerUsername: firstReview.reviewerUsername,
        revieweeUsername: firstReview.revieweeUsername,
      });
      expect(firstReview.isPublished).toBeTruthy();

      secondReview = await Review.findOne({
        rideId: ride._id,
        reviewerUsername: secondReview.reviewerUsername,
        revieweeUsername: secondReview.revieweeUsername,
      });
      expect(secondReview).toEqual(
        expect.objectContaining({
          reviewerUsername: secondReviewer.username,
          revieweeUsername: firstReviewer.username,
          rating: 4,
          rideId: ride._id,
          isPublished: true,
        })
      );

      // Expect both ratings to be updated
      firstReviewer = await User.findOne({ username: firstReviewer.username });
      expect(firstReviewer.rating.totalRatings).toBe(1);
      expect(firstReviewer.rating.sumOfAllRatings).toBe(4);

      secondReviewer = await User.findOne({
        username: secondReviewer.username,
      });
      expect(secondReviewer.rating.totalRatings).toBe(1);
      expect(secondReviewer.rating.sumOfAllRatings).toBe(3);
    });
  });

  describe("Test the operation to decline a review.", () => {
    test("If a user declines to review another user for a particular ride, should add a review document to the database with property isDeclined set to true", async () => {
      const declinedReview = await db.declineReview(
        mongoose.Types.ObjectId(),
        "test_reviewer",
        "test_reviewee"
      );
      expect(declinedReview.isDeclined).toBe(true);
    });
  });

  describe("Test getting usernames to review for a ride", () => {
    afterEach(async () => {
      await Ride.deleteMany();
      await Review.deleteMany();
    });
    test("If a driver has not left any reviews for his passengers, should return all passengers", async () => {
      const passenger1 = await User.create({ username: "passenger_1" });
      const passenger2 = await User.create({ username: "passenger_2" });
      const passenger3 = await User.create({ username: "passenger_3" });
      const ride = await Ride.create({
        ownerUsername: "driver_username",
        passengers: ["passenger_1", "passenger_2", "passenger_3"],
      });
      const usersToReview = await db.getUsersToReviewForRide(
        ride._id,
        "driver_username"
      );
      expect(usersToReview.map((user) => user.username)).toEqual(
        expect.arrayContaining([
          passenger1.username,
          passenger2.username,
          passenger3.username,
        ])
      );
    });

    test("If a driver has left a review for one passenger but not the others, should return the others", async () => {
      const passenger1 = await User.create({ username: "passenger_1" });
      const passenger3 = await User.create({ username: "passenger_3" });
      const ride = await Ride.create({
        ownerUsername: "driver_username",
        passengers: ["passenger_1", "passenger_2", "passenger_3"],
      });
      const reviewToOnePassenger = await Review.create({
        reviewerUsername: "driver_username",
        revieweeUsername: "passenger_2",
        rideId: ride._id,
        rating: 3,
      });
      const usersToReview = await db.getUsersToReviewForRide(
        ride._id,
        "driver_username"
      );
      expect(usersToReview.map((user) => user.username)).toEqual(
        expect.arrayContaining([passenger1.username, passenger3.username])
      );
    });

    test("If a driver has left a review for each of his passengers, should return empty list", async () => {
      const ride = await Ride.create({
        ownerUsername: "driver_username",
        passengers: ["passenger_1", "passenger_2", "passenger_3"],
      });
      const reviewToPassenger1 = await Review.create({
        reviewerUsername: "driver_username",
        revieweeUsername: "passenger_1",
        rideId: ride._id,
        rating: 3,
      });
      const reviewToPassenger2 = await Review.create({
        reviewerUsername: "driver_username",
        revieweeUsername: "passenger_2",
        rideId: ride._id,
        rating: 3,
      });
      const reviewToPassenger3 = await Review.create({
        reviewerUsername: "driver_username",
        revieweeUsername: "passenger_3",
        rideId: ride._id,
        rating: 3,
      });
      const usersToReview = await db.getUsersToReviewForRide(
        ride._id,
        "driver_username"
      );
      expect(usersToReview).toEqual([]);
    });

    test("Should correctly add a new review when properly authenticated.", async () => {
      const userAuthToken = jwt.sign(
        { username: "driver_username" },
        process.env.JWT_SECRET_KEY
      );
      const ride = await Ride.create({
        ownerUsername: "driver_username",
        passengers: ["passenger_1", "passenger_2", "passenger_3"],
      });
      await request(app)
        .get("/reviews/get-eligible-users-to-review")
        .set("Authorization", "Bearer " + userAuthToken)
        .query({ rideId: ride._id.toString() })
        .expect(200);
    });
  });

  describe("Test the publishing of reviews", () => {
    afterEach(async () => {
      await User.deleteMany();
      await Review.deleteMany();
    });
    test("If a review is made public, then its isPublished property should be set to true and the ratings should take effect", async () => {
      const ride = await Ride.create({
        ownerUsername: "driver_username",
        passengers: ["passenger_1"],
      });
      const driverReviewToPassenger = await Review.create({
        reviewerUsername: "driver_username",
        revieweeUsername: "passenger_1",
        rideId: ride._id,
        rating: 3,
      });
      const passenger = await User.create({ username: "passenger_1" });
      await db.makeReviewPublic(
        ride._id,
        driverReviewToPassenger.reviewerUsername,
        driverReviewToPassenger.revieweeUsername
      );

      expect(
        (
          await Review.findOne({
            reviewerUsername: driverReviewToPassenger.reviewerUsername,
            revieweeUsername: driverReviewToPassenger.revieweeUsername,
          })
        ).isPublished
      ).toBe(true);
      expect(
        (await User.findOne({ username: passenger.username })).rating
          .sumOfAllRatings
      ).toBe(3);
      expect(
        (await User.findOne({ username: passenger.username })).rating
          .totalRatings
      ).toBe(1);
    });
  });

  describe("Testing rating system API endpoints", () => {
    const userAuthToken = jwt.sign(
      { username: "registeredUser" },
      process.env.JWT_SECRET_KEY
    );

    test("Should correctly add a new review when properly authenticated.", async () => {
      await request(app)
        .post("/reviews")
        .set("Authorization", "Bearer " + userAuthToken)
        .send({
          revieweeUsername: "some_user",
          rideId: mongoose.Types.ObjectId(),
          rating: 3,
        })
        .expect(200);
    });

    test("When requsting all the reviews left for a user, should expect 200 response code.", async () => {
      await request(app)
        .get("/reviews")
        .query({ username: testRevieweeUsername, pageNum: 0 })
        .expect(200);
    });

    test("When requsting all the reviews left for a user with no reviews, should expect 200 response code still.", async () => {
      await request(app)
        .get("/reviews")
        .query({ username: "user_that_does_not_exist", pageNum: 0 })
        .expect(200);
    });
  });
});
