require("../../src/db/mongoose");
const User = require('../../src/user/user').User
const Ride = require("../../src/ride/ride").Ride 
const Noti = require("../../src/noti/noti").Noti 
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

describe("Testing review notification message formatting helper function", () => {
    test("Testing message to leave a review for a single passenger", async () => {
        expect(await scheduledTasks.formatPassengerReviewMessage(['Sarah'])).toBe('Leave a review for your passenger, Sarah.')
    })
    test("Testing message to leave a review for two passengers", async () => {
        expect(await scheduledTasks.formatPassengerReviewMessage(['Sarah', 'Mike'])).toBe('Leave a review for your passengers, Sarah and Mike.')
    })
    test("Testing message to leave a review for three passengers", async () => {
        expect(await scheduledTasks.formatPassengerReviewMessage(['Sarah', 'Mike', 'Sammy'])).toBe('Leave a review for your passengers, Sarah, Mike, and Sammy.')
    })
})

describe("Testing leave a review notification", () => {
    afterEach(async () => {
        await Ride.deleteMany({})
        await User.deleteMany({})
        await Noti.deleteMany({})
    }) 
    test("Testing whether drivers and passengers receive proper notifications to leave a review", async () => {
        let driver = await User.create({name: 'Sarah Lynn', username: 'driverUsername'})
        let passenger1 = await User.create({name: 'John Smith', username: 'passenger1'})
        let passenger2 = await User.create({name: 'Aiden Turner', username: 'passenger2'})
        const ride = await Ride.create({ownerUsername: "driverUsername", passengers: ['passenger1', 'passenger2'], seats: 0})
        await scheduledTasks.createNotiToLeaveReviewTask(ride._id)()

        expect(await Noti.findOne({username: ride.ownerUsername})).toEqual(expect.objectContaining({
            username: driver.username, msg: "Leave a review for your passengers, John Smith and Aiden Turner.", redirectPath: process.env.MY_DRIVES_PATH
        }))

        expect(await Noti.findOne({username: passenger1.username})).toEqual(expect.objectContaining({
            username: passenger1.username, msg: "Leave a review for your driver, Sarah Lynn.", redirectPath: process.env.MY_RIDES_PATH
        }))

        expect(await Noti.findOne({username: passenger2.username})).toEqual(expect.objectContaining({
            username: passenger2.username, msg: "Leave a review for your driver, Sarah Lynn.", redirectPath: process.env.MY_RIDES_PATH
        }))
    })
})