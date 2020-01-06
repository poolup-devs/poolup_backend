const mongoose = require('mongoose') 
// initialize testing database 
require('../../src/db/mongoose'); 
const db = require('../../src/review/controller'); 
const Review = require('../../src/review/review').Review
const User = require('../../src/user/user').User
const sha256 = require("sha256");
const jwt = require("jsonwebtoken");

const app = require('../../src/app')
const request = require('supertest') 

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

    test("Should successfully return false if no review exists.", async () => {
        expect.assertions(1) 
        try {
            await db.getReview('non_existent_reviewer', 'non_existent_reviewee', mongoose.Types.ObjectId())
        }
        catch(e) {
            expect(e).toEqual(false) 
        }
    })
}) 

describe("Testing rating system endpoints", () => {
    const verifiedUser = new User({
        name: "First Last", 
        username: "verifiedUser", 
        password: sha256("password"), 
        email: "verifiedUser@g.ucla.edu", 
        phoneNumber: '1231231234', 
        verified: true 
    })
    const verifiedUserUsernameAuthToken = jwt.sign({ username: verifiedUser.username }, process.env.JWT_SECRET_KEY);
    
    test("Should correctly add a new review when properly authenticated.", async () => {
        await request(app)
            .post('/reviews')
            .set('Authorization', 'Bearer ' + verifiedUserUsernameAuthToken)
            .send({
                revieweeUsername: 'some_user', 
                rideId: mongoose.Types.ObjectId(), 
                rating: 3
            })
            .expect(200) 
    })

    

}) 
