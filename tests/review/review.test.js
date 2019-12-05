const mongoose = require('../../src/db/mongoose'); 
const db = require('../../src/review/controller'); 
const Review = require('../../src/review/review').Review; 
const jwt = require("jsonwebtoken");


describe("Testing rating system", () => {
    const testReview1 = new Review({
        reviewerUsername: 'test_reviewer', 
        revieweeUsername: 'test_reviewee', 
        rating: 1
    })
    const testReview2 = new Review({
        reviewerUsername: 'test_reviewer', 
        revieweeUsername: 'test_reviewee', 
        rating: 2
    })
    const testReview3 = new Review({
        reviewerUsername: 'test_reviewer', 
        revieweeUsername: 'test_reviewee', 
        rating: 3
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
        const username = 'test_reviewee'
        const expectedRating = ((testReview1.rating + testReview2.rating + testReview3.rating) / 3).toFixed(2)
        return db.getAverageRating(username).then((rating) => {
            expect(rating).toBe(expectedRating);
        })
    })





        



}) 
