require("../../src/db/mongoose");
const app = require('../../src/app')
const request = require('supertest') 
const db = require("../../src/user/controller.js");
const User = require("../../src/user/user").User 
const jwt = require("jsonwebtoken")
jest.setTimeout(30000);

const testUserOneAuthToken = jwt.sign({ username: "jsmith" }, process.env.JWT_SECRET_KEY)
const testUserOne = new User({
    name: "John Smith", 
    username: "jsmith",
    rating: {
        totalValue: 15, 
        totalCount: 3, 
        averageRating: 5
    }, 
    verified: true, 
})

const testUser2 = new User({
    username: "John Smith"
})

beforeEach(async () => {
    await User.deleteMany() 
    await new User(testUserOne).save() 
    await new User(testUser2).save() 
}) 

test('Should error on rating less than 1', async () => {
    expect.assertions(1)
    return db.addNewRating(testUserOne.username, 0).catch((e) => {
        expect(e).toMatch("The rating must be a value from 1 to 5.")
    })
})

test('Should error on rating greater than 5', async () => {
    expect.assertions(1)
    return db.addNewRating(testUserOne.username, 6).catch((e) => {
        expect(e).toBe("The rating must be a value from 1 to 5.")
    })
})

test("Should correctly add a new rating", async () => {
    return db.addNewRating(testUserOne.username, 3).then((newRating) => {
        expect(newRating.toObject()).toEqual({
            totalValue: 18, 
            totalCount: 4
        })
    })
})

test("Should correctly retrieve user's average rating", async () => {
    return db.getAverageRating(testUserOne.username).then((rating) => {
        expect(rating).toEqual({
            averageRating: "5.00"
        })
    })
})

test("Should error when retrieving average rating when user does not have enough ratings", async () => {
    expect.assertions(1)
    return db.getAverageRating(testUser2.username).catch((e) => {
        expect(e).toBe("User must have at least 3 ratings to display an average rating!")
    })
})

test('Route should retrieve the average rating', async () => {
    await request(app)
        .get(`/users/${testUserOne.username}/rating`)
        .set('Authorization', 'Bearer ' + testUserOneAuthToken)
        .send({})
        .expect(200)
})


test('Route should add a new rating', async () => {
    await request(app)
        .patch(`/users/${testUserOne.username}/rating`)
        .set('Authorization', 'Bearer ' + testUserOneAuthToken)
        .send({
            rating: 5.00
        })
        .expect(200)
})
