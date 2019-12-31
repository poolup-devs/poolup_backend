const mongoose = require('mongoose') 
// initialize testing database 
require('../../src/db/mongoose'); 
const db = require('../../src/review/controller'); 

describe("Testing rating system database operations", () => {
    test("A review without a required field, such as rideId, should error instead of creating the review.", async () => {
        try {
            await db.addNewReview({
                reviewerUsername: 'reviewer', 
                revieweeUsername: 'reviewee', 
                rating: 2
            }) 
        } 
        catch(e) {
            expect(e).toMatch('Review must contain a reviewer username, reviewee username, rating, and associated ride ID') 
        }
    })

    test("Adding a review with all the required fields should create a new review document in the database.", async () => {
        try {
            const reviewInfo = {
                reviewerUsername: 'reviewer', 
                revieweeUsername: 'reviewee', 
                rating: 2, 
                rideId: mongoose.Types.ObjectId() 
            }
            const {reviewerUsername, revieweeUsername, rating, rideId} = reviewInfo 
            const newReview = await db.addNewReview(reviewInfo)
            expect(newReview).toEqual(expect.objectContaining({
                reviewerUsername, revieweeUsername, rating, rideId
            })) 
        } 
        catch(e) {
            console.log(e)
        }
    })
}) 

describe("Testing rating system endpoints", () => {
}) 
