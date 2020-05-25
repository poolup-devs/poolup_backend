let agenda = require("../../src/agenda/agenda");
const MongoClient = require("mongodb");
let mongoDb = null;
let mongoClient = null;

describe("Testing scheduling of jobs", () => {
  // Opening up a connection to the test database to clear the "scheduledJobs" collection
  beforeAll(async () => {
    // Define a test task
    await agenda.define("test_task", (job, done) => {
      done();
    });
    mongoClient = await MongoClient.connect(process.env.MONGODB_URL, {
      useUnifiedTopology: true,
    });
    mongoDb = mongoClient.db(process.env.MONGODB_URL.split("/").pop());
  });

  afterAll(async () => {
    await agenda.close();
    await mongoClient.close();
  });

  // Delete all scheduled jobs in the database
  afterEach(async () => {
    await mongoDb.collection("scheduledJobs").deleteMany({});
  });

  describe("Testing scheduling helper methods", () => {
    test("Test that scheduling a task to run 2 hours after date has the expected run date.", async () => {
      const now = new Date();
      const job = await agenda.scheduleJobHoursAfterDate("test_task", {}, now, 2);
      now.setHours(now.getHours() + 2);
      expect(job.attrs.nextRunAt.getTime() === now.getTime()).toBeTruthy();
    });

    test("Test that scheduling a task to run 30 minutes after date has the expected run date.", async () => {
      const now = new Date();
      const job = await agenda.scheduleJobMinutesAfterDate("test_task", {}, now, 30);
      now.setMinutes(now.getMinutes() + 30);
      expect(job.attrs.nextRunAt.getTime() === now.getTime()).toBeTruthy();
    });
  })

  describe("Testing cancellation of jobs", () => {
    test("Testing cancellation of ride related jobs", async () => {
      const tasksToCancel = [
        "update number of completed rides",
        "send leave a review web notifications",
      ];
      const rideId = 1;
      let i;
      for (i = 0; i < tasksToCancel.length; i++) {
        await agenda.schedule("1 hour", tasksToCancel[i], { rideId });
      }
      await agenda.cancelJobsAssociatedWithRide(rideId);
      for (i = 0; i < tasksToCancel.length; i++) {
        let rideRelatedJob = await agenda.jobs({ name: tasksToCancel[i], data: { rideId } });
        expect(rideRelatedJob.length).toBe(0);
      }
    })
  })

})

