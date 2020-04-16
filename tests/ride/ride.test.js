require("../../src/db/mongoose");
const User = require('../../src/user/user').User
const Ride = require("../../src/ride/ride").Ride 
const Noti = require("../../src/noti/noti").Noti
const app = require('../../src/app')
const request = require('supertest') 
const db = require("../../src/ride/controller.js");
const jwt = require("jsonwebtoken");



describe("Testing Ride endpoints", () => {
    describe("Testing when a user joins a ride", () => {
        afterEach(async () => {
            await Ride.deleteMany({})
            await User.deleteMany({})
            await Noti.deleteMany({})
        }) 
        test("Expect when a user joins a ride, the user is added to the ride's list of passengers, the number of seats is decremented, and a notification is sent to the driver", async (done) => {
            const passenger = await User.create({username: "passenger_2"})
            const ownerUsername = "driverUsername" 
            let ride = await Ride.create({ownerUsername, passengers: ['passenger_1'], seats: 2})
            db.joinRide(ownerUsername, ride._id, passenger.username, async (err, res) => {
                expect(Array.from(res.passengers).sort()).toEqual(['passenger_1', 'passenger_2'])
                expect(res.seats).toBe(1)
                expect((await Noti.findOne({username: ownerUsername}).lean())).toEqual(expect.objectContaining({
                    username: ownerUsername, msg: "passenger_2 has joined your ride"
                }))
                done()
            })
        })
    })

    describe("Testing cancellation of rides", () => {
        afterEach(async () => {
            await Ride.deleteMany({})
            await User.deleteMany({})
            await Noti.deleteMany({})
        }) 

        test("Test cancellation of a ride with passengers as a driver", async () => {
            const driver = await User.create({username: "driverUsername", email: "driverUsername@ucla.edu"})
            const ride = await Ride.create({ownerUsername: "driverUsername", passengers: ["passenger1", "passenger2"]})
            
            await db.cancelRide(ride._id, "driverUsername", "No longer traveling")

            // Check whether ride was deleted 
            const cancelledRide = await Ride.findOne({ownerUsername: ride.ownerUsername}) 
            expect(cancelledRide).toBe(null)

            // Check incrementation of cancelled rides 
            const user = await User.findOne({username: driver.username})
            expect(user.ridesCancelled).toBe(1)

            // Check creation of notification to each passenger with expected properties 
            const noti1 = await Noti.findOne({username: "passenger1"})
            expect(noti1).toEqual(expect.objectContaining({
                username: 'passenger1', msg: 'driverUsername has cancelled your ride' 
            }))
            expect(noti1.additionalProperties).toEqual({cancellationReason: 'No longer traveling'})

            const noti2 = await Noti.findOne({username: "passenger2"})
            expect(noti2).toEqual(expect.objectContaining({
                username: 'passenger2', msg: 'driverUsername has cancelled your ride' 
            }))
            expect(noti1.additionalProperties).toEqual({cancellationReason: 'No longer traveling'})

        })

        test("Test cancellation of a ride without passengers as a driver", async () => {
            const driver = await User.create({username: "driverUsername", email: "driverUsername@ucla.edu"})
            const ride = await Ride.create({ownerUsername: "driverUsername"})
            try {
                await db.cancelRide(ride._id, "driverUsername")

                // Check whether ride was deleted 
                const cancelledRide = await Ride.findOne({ownerUsername: ride.ownerUsername}) 
                expect(cancelledRide).toBe(null)
            }
            catch(e) {
                console.log(e)
            }
        })

        test("Test cancellation of a ride as a passenger", async () => {
            const passenger = await User.create({username: "passenger1", email: 'passenger1@ucla.edu'})
            const ride = await Ride.create({ownerUsername: "driverUsername", passengers: ['passenger1', 'passenger2'], seats: 0})
            await db.cancelRide(ride._id, "passenger1", "Other", "Sorry I can't make it!!!")

            // Check whether a notification was sent to the driver 
            const driverNoti = await Noti.findOne({username: 'driverUsername'})
            expect(driverNoti).toEqual(expect.objectContaining({
                username: 'driverUsername', 'msg': 'passenger1 has cancelled your ride'
            }))
            expect(driverNoti.additionalProperties).toEqual({cancellationReason: 'Other', messageToDriver: "Sorry I can't make it!!!"})

            // Check whether passenger was removed from ride 
            const cancelledRide = await Ride.findOne({ownerUsername: ride.ownerUsername}).lean()
            expect(cancelledRide.seats).toBe(1)
            expect(cancelledRide.passengers).toEqual(['passenger2'])
            
            // Check incrementation of cancelled rides 
            const user = await User.findOne({username: passenger.username})
            expect(user.ridesCancelled).toBe(1)
        })

        test("Test error when trying to cancel a ride that the user does not belong to", async () => {
            const ride = await Ride.create({ownerUsername: "driverUsername", passengers: ['passenger1'], seats: 1})
            expect.assertions(1)
            try {
                await db.cancelRide(ride._id, "userNotInRide")
            }
            catch(e) {
                expect(e).toBeTruthy()
            }
        })

        test("Expect a response code of 200 when cancelling a ride as a passenger.", async () => {
            const passenger = await User.create({username: "passenger1", email: 'passenger1@ucla.edu'})
            const ride = await Ride.create({ownerUsername: "driverUsername", passengers: ['passenger1'], seats: 1})
            const authToken = jwt.sign({ username: 'passenger1' }, process.env.JWT_SECRET_KEY);

            await request(app)
                .put('/rides/cancel-ride')
                .set('Authorization', 'Bearer ' + authToken)
                .send({cancellationReason: "Change of travel plans", messageToDriver: "I'm so sorry for cancelling on you! :(", ride})
                .expect(200) 
        })

        test("Expect a response code of 200 when cancelling a ride as a passenger.", async () => {
            const driver = await User.create({username: "driverUsername", email: 'driver@ucla.edu'})
            const ride = await Ride.create({ownerUsername: "driverUsername", passengers: ['passenger1'], seats: 1})
            const authToken = jwt.sign({ username: 'driverUsername' }, process.env.JWT_SECRET_KEY);

            await request(app)
                .put('/rides/cancel-ride')
                .set('Authorization', 'Bearer ' + authToken)
                .send({cancellationReason: "Change of travel plans", ride})
                .expect(200) 
        })
    }) 
})
