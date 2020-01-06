const mongoose = require('mongoose') 
// initialize testing database 
require('../../src/db/mongoose'); 
const db = require('../../src/review/controller'); 
const Review = require('../../src/review/review').Review
const jwt = require("jsonwebtoken");

const app = require('../../src/app')
const request = require('supertest') 

describe("Testing rating system database operations", () => {
    const username = 'test_reviewee'
    const testReview1 = new Review({
        reviewerUsername: 'test_reviewer', 
        revieweeUsername: 'test_reviewee', 
        rating: 1, 
    })
    const testReview2 = new Review({
        reviewerUsername: 'test_reviewer', 
        revieweeUsername: 'test_reviewee', 
        rating: 2, 
    })
    const testReview3 = new Review({
        reviewerUsername: 'test_reviewer', 
        revieweeUsername: 'test_reviewee', 
        rating: 3, 
    })

    beforeEach(() => {
        new Review(testReview1).save()
        new Review(testReview2).save()
        return new Review(testReview3).save()
    }) 

    afterEach(() => {
        return Review.deleteMany() 
    })
        
    test("Calculate average rating of a user by aggregating all reviews made to them.", async () => {
        expect.assertions(1);
        const expectedRating = ((testReview1.rating + testReview2.rating + testReview3.rating) / 3).toFixed(2)
        return db.getAverageRating(username).then((rating) => {
            expect(rating).toBe(expectedRating);
        })
    }, 30000)

    test("When retrieving the average rating of a user without at least 3 ratings, should result in an error message.", async () => {
        expect.assertions(1)
        try {
            await db.getAverageRating('user_without_sufficient_reviews') 
        }
        catch(e) {
            await expect(e).toBe("User must have at least 1 rating(s) to display an average rating!")
        }
    })

    test("Get all of the reviews associated with a user with at least 1 review.",  () => {
        const expectedReviews = [testReview1._id, testReview2._id, testReview3._id]
        return db.getUserReviews(username).then((reviews) => {
            expect(reviews.map(a => a._id)).toStrictEqual(expectedReviews)
        })
    })

    test("Get all of the reviews associated with a user with 0 reviews.",  () => {
        return db.getUserReviews('user_that_does_not_exist').then((reviews) => {
            expect(reviews.length).toBe(0)
        })
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

    describe("Testing rating system API endpoints", () => {
        const verifiedUserUsernameAuthToken = jwt.sign({ username: 'verified_user' }, process.env.JWT_SECRET_KEY);
        
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
    
        test("When requesting the average rating of a user that is in the database, should return 200 response code", async () => {
            await request(app)
                .get("/reviews/rating")
                .query({username})
                .expect(200)
        })
    
        test("When requesting the average rating of a user that has no reviews, should return 404 response code", async () => {
            await request(app)
                .get("/reviews/rating")
                .query({username: 'does_not_exist'})
                .expect(404)
        })
    
        test("When requsting all the reviews left for a user, should expect 200 response code.", async () => {
            await request(app)
                .get('/reviews') 
                .query({username})
                .expect(200)
        })

        test("When requsting all the reviews left for a user with no reviews, should expect 200 response code still.", async () => {
            await request(app)
                .get('/reviews') 
                .query({username: 'user_that_does_not_exist'})
                .expect(200)
        })
    }) 
}) 

 // test("Should successfully return review if one exists.", async () => {
    //     try {
    //         const rideId = "5e0bbafc4e9496254c24af30"    
    //         var testReview1 = new Review({
    //             reviewerUsername: 'test_reviewer', 
    //             revieweeUsername: 'test_reviewee', 
    //             rating: 1, 
    //             rideId
    //         })
    //         testReview1 = await new Review(testReview1).save()

    //         const review = await db.getReview('test_reviewer', 'test_reviewee', rideId) 
    //         expect(review.revieweeUsername).toBe(testReview1.revieweeUsername)
    //         expect(review.reviewerUsername).toBe(testReview1.reviewerUsername)
    //         expect(review.rideId.toString()).toBe(testReview1.rideId.toString())
    //     }
    //     catch(e) {
    //         console.log(e)
    //     }
    // }) 

    // test("Should successfully return false if no review exists.", async () => {
    //     expect.assertions(1) 
    //     try {
    //         await db.getReview('non_existent_reviewer', 'non_existent_reviewee', mongoose.Types.ObjectId())
    //     }
    //     catch(e) {
    //         expect(e).toEqual(false) 
    //     }
    // })

