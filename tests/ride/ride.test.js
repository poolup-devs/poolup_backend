require("../../src/db/mongoose");
const Ride = require("../../src/ride/ride").Ride 
const app = require('../../src/app')
const request = require('supertest') 
const db = require("../../src/ride/controller.js");


describe("Testing Ride endpoints", () => {

    describe("Testing retrieval of completed rides", () => {
        afterEach(async () => {
            await Ride.deleteMany({})
        }) 
    
        test("If a user has completed a single ride as a driver, expect getRidesCompleted to return 1", async () => {
            const rideWithUserAsDriver = await Ride.create({ownerUsername: 'test_username', passengers: ['passenger_1'], date: new Date()})
            const ridesCompleted = await db.getRidesCompleted('test_username') 
            expect(ridesCompleted).toBe(1)
        })
    
        test("If a user has completed a single ride as a passenger, expect getRidesCompleted to return 1", async () => {
            const rideWithUserAsPassenger = await Ride.create({ownerUsername: 'driver_1', passengers: ['test_username'], date: new Date()})
            const ridesCompleted = await db.getRidesCompleted('test_username') 
            expect(ridesCompleted).toBe(1)
        })

        test("If a user created a ride as a driver but did not have any passengers on it, expect getRidesCompleted to return 0", async () => {
            const emptyRide = await Ride.create({ownerUsername: 'test_username', passengers: [], date: new Date()})
            const ridesCompleted = await db.getRidesCompleted('test_username') 
            expect(ridesCompleted).toBe(0)
        })

        test("If a user a single ride completed but an upcoming ride that has not completed yet, should expect getRidesCompleted to return 1", async () => {
            const completedRide = await Ride.create({ownerUsername: 'test_username', passengers: ['passenger_1'], date: new Date()})
            const upcomingRide = await Ride.create({ownerUsername: 'test_username', passengers: ['passenger_1'], date: new Date(Date.now() + 7*24*60*60*1000)}) // 7 days from now in milliseconds
            const ridesCompleted = await db.getRidesCompleted('test_username') 
            expect(ridesCompleted).toBe(1)
        })
    }) 

})

describe("Testing Ride API endpoints", () => {
    test("Expect a response code of 200 when querying for a user's number of rides completed", async () => {
        await request(app)
            .get('/rides/get-rides-completed')
            .query({username: 'test_username'})
            .expect(200) 
    })
})