const express = require('express') 
const router = new express.Router()
const db = require('./controller')
const checkAuth = require("../middleware/jwt_authenticator.js");

// Add a new rating 
router.post("/reviews", checkAuth, async (req, res) => {
    try {
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
        res.status(401).send('No review can be found')
    }
}) 

module.exports = router;
