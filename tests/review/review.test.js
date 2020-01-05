const mongoose = require('mongoose') 
// initialize testing database 
require('../../src/db/mongoose'); 
const db = require('../../src/review/controller'); 
const Review = require('../../src/review/review').Review

describe("Testing rating system database operations", () => {
    afterEach(() => {
        return Review.deleteMany() 
    })

    test("A review without a required field, such as rideId, should error instead of creating the review.", async () => {
        try {
            expect.assertions(1)
            await db.addNewReview({
                reviewerUsername: 'reviewer', 
                revieweeUsername: 'reviewee', 
                rating: 2
            }) 
        } 
        catch(e) {
            await expect(e).toMatch('Review must contain a reviewer username, reviewee username, rating, and associated ride ID') 
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
            const newReview = await db.addNewReview(reviewInfo)
            const {reviewerUsername, revieweeUsername, rating, rideId} = reviewInfo
            await expect(newReview).toEqual(expect.objectContaining({
                reviewerUsername, revieweeUsername, rating, rideId
            })) 
        } 
        catch(e) {
            console.log(e)
        }
    })

    test("Should successfully return review if one exists.", async () => {
        try {
            const rideId = "5e0bbafc4e9496254c24af30"    
            var testReview1 = new Review({
                reviewerUsername: 'test_reviewer', 
                revieweeUsername: 'test_reviewee', 
                rating: 1, 
                rideId
            })
            testReview1 = await new Review(testReview1).save()

            const review = await db.getReview('test_reviewer', 'test_reviewee', rideId) 
            expect(review.revieweeUsername).toBe(testReview1.revieweeUsername)
            expect(review.reviewerUsername).toBe(testReview1.reviewerUsername)
            expect(review.rideId.toString()).toBe(testReview1.rideId.toString())
        }
        catch(e) {
            console.log(e)
        }
    }) 
}) 

describe("Testing rating system endpoints", () => {
    

}) 
