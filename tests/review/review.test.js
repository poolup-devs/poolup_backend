const mongoose = require('mongoose') 
// initialize testing database 
require('../../src/db/mongoose'); 
const db = require('../../src/review/controller'); 
const Review = require('../../src/review/review').Review; 

describe("Testing rating system", () => {
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
        jest.setTimeout(30000);
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
    })

    test("When retrieving the average rating of a user without at least 3 ratings, should result in an error message.", async () => {
        expect.assertions(1)
        try {
            await db.getAverageRating('user_without_sufficient_reviews') 
        }
        catch(e) {
            expect(e).toBe("User must have at least 3 ratings to display an average rating!")
        }
    })

    test("Get all of the reviews associated with a user.", async () => {
        const expectedReviews = [testReview1._id, testReview2._id, testReview3._id]
        return db.getUserReviews(username).then((reviews) => {
            expect(reviews.map(a => a._id)).toStrictEqual(expectedReviews)
        })
    })

    test("Should error when trying to retrieve all reviews from a user with no reviews.", async () => {
        try {
            await db.getUserReviews('user_that_does_not_exist') 
        } 
        catch(e) {
            expect(e).toMatch("Username 'user_that_does_not_exist' has not received any reviews")
        }
    })

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
            const msg = await db.addNewReview({
                reviewerUsername: 'reviewer', 
                revieweeUsername: 'reviewee', 
                rating: 2, 
                rideId: mongoose.Types.ObjectId() 
            })
            expect(msg).toMatch('Success') 
        } 
        catch(e) {
            console.log(e)
        }
    })







        



}) 
