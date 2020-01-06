const express = require('express') 
const router = new express.Router()
const db = require('./controller')
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");


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

// Get a review, or return false if the review has not been made yet 
router.get("/reviews", checkAuth, async (req, res) => {
    try {
        const {reviewer, reviewee, rideId} = req.body 
        const review = await db.getReview(reviewer, reviewee, rideId)
        res.status(200).send(review) 
    }
    catch(e) {
        res.status(404).send('Review not found')
    }
}) 

module.exports = router;
