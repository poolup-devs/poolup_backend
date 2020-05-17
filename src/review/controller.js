const User = require("../user/user").User;
const Review = require("./review").Review;
const Ride = require("../ride/ride").Ride;
const agenda = require("../../src/agenda/agenda");

const ControllerException = require("../utils/errors/controllerException");

// Create a new review with required properties: reviewer username, reviewee username, rating, and ride ID
const addNewReview = (newReviewInfo) => {
  return new Promise(async (resolve, reject) => {
    // Required properties of Review object
    const requiredProperties = ["reviewerUsername", "revieweeUsername", "rating", "rideId"];
    try {
      // Simple field validation
      if (requiredProperties.every((property) => newReviewInfo.hasOwnProperty(property))) {
        const { reviewerUsername, revieweeUsername, rideId } = newReviewInfo;

        // Prevent duplicate insertion if document already exists
        if (
          !(await Review.findOne({
            reviewerUsername,
            revieweeUsername,
            rideId,
          }))
        ) {
          const counterpartReview = await Review.findOne({
            reviewerUsername: revieweeUsername,
            revieweeUsername: reviewerUsername,
            rideId,
          });

          // Counterpart has already left their review
          if (counterpartReview) {
            var newReview = await Review.create(newReviewInfo);
            // Publish both reviews
            await makeReviewPublic(rideId, reviewerUsername, revieweeUsername);
            await makeReviewPublic(rideId, revieweeUsername, reviewerUsername);

            // Cancel the scheduled tasks that expire the ability to review
            const ride = await Ride.findById(rideId);
            const driverUsername =
              ride.ownerUsername == reviewerUsername ? reviewerUsername : revieweeUsername;
            const passengerUsername =
              reviewerUsername != driverUsername ? reviewerUsername : revieweeUsername;

            await agenda.cancel({
              name: "expire ability to leave review",
              data: {
                rideId: newReviewInfo.rideId,
                driverUsername,
                passengerUsername,
              },
            });
          } else {
            // Counterpart has not left their review, so create new review but leave it as unpublished
            var newReview = await Review.create(newReviewInfo);
          }
          resolve(newReview);
        } else {
          reject(
            new ControllerException(
              400,
              "A review has already been made to " +
                newReviewInfo.revieweeUsername +
                " for this ride."
            )
          );
        }
      }
      reject(
        new ControllerException(
          400,
          "Review must contain a reviewer username, reviewee username, rating, and associated ride ID"
        )
      );
    } catch (err) {
      return reject(err);
    }
  });
};

// Decline to review a user on a particular ride
const declineReview = (rideId, reviewer, reviewee) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (
        !(await Review.findOne({
          reviewerUsername: reviewer,
          revieweeUsername: reviewee,
          rideId,
        }))
      ) {
        const declinedReview = await new Review({
          revieweeUsername: reviewee,
          reviewerUsername: reviewer,
          rideId,
          isDeclined: true,
        }).save();
        resolve(declinedReview);
      }
      reject(
        new ControllerException(
          400,
          "User has already declined to review " + reviewee + " for ride: " + rideId
        )
      );
    } catch (err) {
      return reject(err);
    }
  });
};

// Get all the publically available reviews received by a user
const getUserReviews = (username, pageNumber) => {
  return new Promise(async (resolve, reject) => {
    try {
      await Review.find(
        { revieweeUsername: username, isDeclined: false, isPublished: true },
        (err, reviews) => {
          // if there are no reviews, return []
          resolve(Array.from(reviews));
        }
      )
        .sort({ datePosted: -1 })
        .skip(pageNumber * 5)
        .limit(5)
        .lean();
    } catch (err) {
      return reject(err);
    }
  });
};

const getUsersToReviewForRide = (rideId, username) => {
  return new Promise(async (resolve, reject) => {
    const rideDetails = await Ride.findById(rideId).lean();

    // User was a driver
    if (username == rideDetails.ownerUsername) {
      let usersToReview = [];
      for (let i = 0; i < rideDetails.passengers.length; i++) {
        const existingReview = await Review.findOne({
          reviewerUsername: username,
          revieweeUsername: rideDetails.passengers[i],
          rideId,
        });
        if (!existingReview) {
          const passenger = await User.findOne({
            username: rideDetails.passengers[i],
          }).lean();
          usersToReview.push(passenger);
        }
      }
      resolve(usersToReview);
    }

    // User was a passenger
    const existingReview = await Review.findOne({
      reviewerUsername: username,
      revieweeUsername: rideDetails.ownerUsername,
      rideId,
    }).lean();
    if (existingReview) {
      resolve([]);
    } else {
      const driver = await User.findOne({
        username: rideDetails.ownerUsername,
      }).lean();
      resolve([driver]);
    }
  });
};

// Publish the review, making the view public and applying the rating changes
const makeReviewPublic = (rideId, reviewerUsername, revieweeUsername) => {
  return new Promise(async (resolve, reject) => {
    try {
      const review = await Review.findOne({
        rideId,
        reviewerUsername,
        revieweeUsername,
      });
      if (review) {
        review.isPublished = true;
        await review.save();

        await User.findOneAndUpdate(
          { username: revieweeUsername },
          {
            $inc: {
              "rating.sumOfAllRatings": review.rating,
              "rating.totalRatings": 1,
            },
          }
        );
        return resolve(review);
      } else {
        return reject(new ControllerException(404, "review not found"));
      }
    } catch (err) {
      return reject(err);
    }
  });
};

module.exports = {
  addNewReview,
  declineReview,
  getUserReviews,
  getUsersToReviewForRide,
  makeReviewPublic,
};
