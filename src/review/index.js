const express = require('express') 
const router = new express.Router()
const db = require('./controller')
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js"); 


// Add a new review using currently logged in account 
router.post("/reviews", checkAuth, async (req, res) => {
    try {
        const loggedInUser = tokenParser(req.headers.authorization).username
        req.body['reviewerUsername'] = loggedInUser 
        const review = await db.addNewReview(req.body)
        res.status(200).send(review) 
    }
    catch(e) {
        res.status(500).send({error: e})
    }
}) 

// Add a review that indicates a user has declined to review another user for a particular ride 
router.post("/reviews/decline-review", checkAuth, async (req, res) => {
    try {
        const loggedInUser = tokenParser(req.headers.authorization).username
        const declinedReview = await db.declineReview(loggedInUser, req.body.revieweeUsername, req.body.rideId)
        res.status(200).send(declinedReview) 
    }
    catch(e) {
        res.status(500).send({error: e}) 
    }
})

// Get all reviews received by a user 
router.get("/reviews", async (req, res) => {
    try {
      const userReviews = await db.getUserReviews(req.query.username)
      res.status(200).send(userReviews) 
    }
    catch(e) {
      res.status(500).send({error: e}) 
    }
}) 
  
// Get a list of users that need to be reviewed using the currently logged in account 
router.get("/reviews/get-eligible-users-to-review", checkAuth, async (req, res) => {
    try {
        const loggedInUser = tokenParser(req.headers.authorization).username
        const usersToReview = await db.getUsersToReviewFromLatestRide(loggedInUser) 
        res.status(200).send(usersToReview)
    }
    catch(e) {
        res.status(500).send({error: e})
    }
}) 

module.exports = router;
