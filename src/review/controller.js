const User = require("../user/user").User;
const Review = require("./review").Review;
const Ride = require("../ride/ride").Ride;
const agenda = require("../../src/agenda/agenda");

// Create a new review with required properties: reviewer username, reviewee username, rating, and ride ID
const addNewReview = (newReviewInfo) => {
  return new Promise(async (resolve, reject) => {
    // Required properties of Review object
    const requiredProperties = [
      "reviewerUsername",
      "revieweeUsername",
      "rating",
      "rideId",
    ];
    try {
      // Simple field validation
      if (
        requiredProperties.every((property) =>
          newReviewInfo.hasOwnProperty(property)
        )
      ) {
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
              ride.ownerUsername == reviewerUsername
                ? reviewerUsername
                : revieweeUsername;
            const passengerUsername =
              reviewerUsername != driverUsername
                ? reviewerUsername
                : revieweeUsername;

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
            "A review has already been made to " +
              newReviewInfo.revieweeUsername +
              " for this ride."
          );
        }
      }
      reject(
        "Review must contain a reviewer username, reviewee username, rating, and associated ride ID"
      );
    } catch (e) {
      reject(e);
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
        "User has already declined to review " +
          reviewee +
          " for ride: " +
          rideId
      );
    } catch (e) {
      reject("Could not add the declined review to the database.");
    }
  });
};

// Get all the publically available reviews received by a user
const getUserReviews = (username, pageNumber) => {
  return new Promise(async (resolve, reject) => {
    await Review.find(
      { revieweeUsername: username, isDeclined: false, isPublished: true },
      (err, reviews) => {
        // if there are no reviews, return []
        resolve(Array.from(reviews));
      }
    )
      .sort({ datePosted: -1 })
      .skip(pageNumber * 5)
      .limit(5);
  });
};

const getUsersToReviewForRide = (rideId, username) => {
  return new Promise(async (resolve, reject) => {
    const rideDetails = await Ride.findById(rideId);

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
          });
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
    });
    if (existingReview) {
      resolve([]);
    } else {
      const driver = await User.findOne({
        username: rideDetails.ownerUsername,
      });
      resolve([driver]);
    }
  });
};

// Publish the review, making the view public and applying the rating changes
const makeReviewPublic = (rideId, reviewerUsername, revieweeUsername) => {
  return new Promise(async (resolve, reject) => {
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
      resolve(review);
    } else {
      reject("Could not find review in the database to make public.");
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
