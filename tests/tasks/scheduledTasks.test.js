require("../../src/db/mongoose");
const User = require('../../src/user/user').User
const Ride = require("../../src/ride/ride").Ride 
const scheduledTasks = require('../../src/tasks/scheduledTasks')

describe("Testing the update completed rides scheduled task", () => {
    afterEach(async () => {
        await Ride.deleteMany({})
        await User.deleteMany({})
    }) 
    test("Expect no updates to completed rides if there are no passengers in the ride", async () => {
        let driver = await User.create({username: 'driverUsername'})
        const ride = await Ride.create({ownerUsername: "driverUsername", passengers: [], seats: 0})

        await scheduledTasks.updateCompletedRidesTask(ride._id)()
        driver = await User.findById(driver._id)
        expect(driver.ridesCompleted).toBe(0)
    })

    test("Expect driver receives a completed ride for each passenger, and each passenger receives one completed ride", async () => {
        let driver = await User.create({username: 'driverUsername'})
        let passenger1 = await User.create({username: 'passenger1'})
        let passenger2 = await User.create({username: 'passenger2'})
        const ride = await Ride.create({ownerUsername: "driverUsername", passengers: ['passenger1', 'passenger2'], seats: 0})

        await scheduledTasks.updateCompletedRidesTask(ride._id)()
        driver = await User.findById(driver._id)
        passenger1 = await User.findById(passenger1._id)
        passenger2 = await User.findById(passenger2._id)
        expect(driver.ridesCompleted).toBe(2)
        expect(passenger1.ridesCompleted).toBe(1)
        expect(passenger2.ridesCompleted).toBe(1)
    })
})