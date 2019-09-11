require("../../src/db/mongoose");
const request = require('supertest') 
const db = require("../../src/user/controller.js");
const User = require("../../src/user/user").User 

const testUser1 = new User({
    name: "John Smith", 
    rating: {
        totalValue: 15, 
        totalCount: 3, 
        averageRating: 5
    }, 
})

const testUser2 = new User({
    name: "John Smith"
})

beforeEach(async () => {
    await User.deleteMany() 
    await new User(testUser1).save() 
    await new User(testUser2).save() 
}) 

test('Should error on rating less than 1', async () => {
    expect.assertions(1)
    return db.addNewRating(testUser1._id, 0).catch((e) => {
        expect(e).toMatch("The rating must be a value from 1 to 5.")
    })
})

test('Should error on rating greater than 5', async () => {
    expect.assertions(1)
    return db.addNewRating(testUser1._id, 6).catch((e) => {
        expect(e).toBe("The rating must be a value from 1 to 5.")
    })
})

test("Should correctly add a new rating", async () => {
    return db.addNewRating(testUser1._id, 3).then((newRating) => {
        expect(newRating.toObject()).toEqual({
            totalValue: 18, 
            totalCount: 4, 
            averageRating: 4.5
        })
    })
})

test("Should correctly retrieve user's average rating", async () => {
    return db.getAverageRating(testUser1._id).then((rating) => {
        expect(rating).toEqual({
            averageRating: 5
        })
    })
})

test("Should error when retrieving average rating when user does not have enough ratings", async () => {
    expect.assertions(1)
    return db.getAverageRating(testUser2._id).catch((e) => {
        expect(e).toBe("User must have at least 3 ratings to display an average rating!")
    })
})

