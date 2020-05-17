const express = require("express");
const router = new express.Router();
const db = require("./controller");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");
const errResp = require("../utils/errors/errResponse");

// Add a new review using currently logged in account
router.post("/reviews", checkAuth, async (req, res) => {
  try {
    const loggedInUser = await tokenParser(req.headers.authorization);
    req.body["reviewerUsername"] = loggedInUser;
    const review = await db.addNewReview(req.body);
    res.status(200).send(review);
  } catch (err) {
    errResp(res, err);
  }
});

// Add a review that indicates a user has declined to review another user for a particular ride
router.post("/reviews/decline-review", checkAuth, async (req, res) => {
  try {
    const loggedInUser = await tokenParser(req.headers.authorization);
    const declinedReview = await db.declineReview(
      req.body.rideId,
      loggedInUser,
      req.body.revieweeUsername
    );
    res.status(200).send(declinedReview);
  } catch (err) {
    errResp(res, err);
  }
});

// Get reviews received by a user
router.get("/reviews", async (req, res) => {
  try {
    const userReviews = await db.getUserReviews(
      req.query.username,
      req.query.pageNum
    );
    res.status(200).send(userReviews);
  } catch (err) {
    errResp(res, err);
  }
});

// Get all users to review for a ride
router.get(
  "/reviews/get-eligible-users-to-review",
  checkAuth,
  async (req, res) => {
    try {
      const loggedInUser = await tokenParser(req.headers.authorization);
      const usersToReview = await db.getUsersToReviewForRide(
        req.query.rideId,
        loggedInUser
      );
      res.status(200).send({ usersToReview });
    } catch (err) {
      errResp(res, err);
    }
  }
);

module.exports = router;
