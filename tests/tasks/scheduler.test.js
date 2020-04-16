const sinon = require("sinon")
const scheduler = require('../../src/tasks/scheduler')
describe("Testing scheduling of jobs", () => {
    test("Test that scheduling a task to run 2 hours after date indeed runs", () => {
        const clock = sinon.useFakeTimers() 
        var ranTask = false 
        const task = () => {
            return function() {
                ranTask = true 
            }
        }
        scheduler.scheduleTaskHoursAfterDate('task_name', task(), new Date(), 2)
        clock.tick(7200250) // 2 hours and a bit more 
        expect(ranTask).toBe(true)
        clock.restore()
    })
})

describe("Testing cancellation of scheduled jobs", () => {
    test("Test that canceling a scheduled task does prevents it from running", () => {
        const clock = sinon.useFakeTimers() 
        var ranTask = false 
        const task = () => {
            return function() {
                ranTask = true 
            }
        }
        scheduler.scheduleTaskHoursAfterDate('task_name', task(), new Date(), 2)
        clock.tick(10000) // some time passes before cancellation 
        scheduler.cancelTask('task_name')
        clock.tick(7200250) // 2 hours and a bit more 
        expect(ranTask).toBe(false)
        clock.restore()
    })
})