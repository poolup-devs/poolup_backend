const express = require('express') 
const router = new express.Router()
const db = require('./controller')
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js"); 

// Get a list of users that need to be reviewed using the currently logged in account 
router.get("/reviews/eligible-users", checkAuth, async (req, res) => {
    try {
        const loggedInUser = tokenParser(req.headers.authorization).username
        const usersToReview = await db.getUsersToReviewFromLatestRide(loggedInUser) 
        res.status(200).send(usersToReview)
    }
    catch(e) {
        res.status(500).send({error: e})
    }
}) 

// Add a new rating using currently logged in account 
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
  
// Get the average rating of a user 
router.get("/reviews/rating", async (req, res) => {
    try {
        const avgRating = await db.getAverageRating(req.query.username)
        res.status(200).send(avgRating)
    }
    catch(e) {
        res.status(404).send({error: e}) 
    }
})

module.exports = router;
