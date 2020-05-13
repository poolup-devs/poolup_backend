const Agenda = require("agenda");
const path = require("path");
const fs = require("fs");

const agenda = new Agenda({
  db: {
    address: process.env.MONGODB_URL,
    collection: "scheduledJobs",
    options: {
      useUnifiedTopology: true
    }
  },
});

// Link the bindings directory 
const bindingsDirectory = path.join(__dirname, "/bindings");
fs.readdir(bindingsDirectory, (err, jobTypes) => {
  if (err) {
    console.log("Could not locate agenda bindings.");
  }
  else {
    // Make available the agenda object for each task file
    jobTypes.forEach((type) => {
      require("./bindings/" + type)(agenda);
    });

    if (jobTypes.length) {
      // Wait until agenda connects with the database before starting the daemon
      agenda.on("ready", async () => {
        await agenda.start();
      });
    }
  }
})

// Graceful shutdown
const graceful = async () => {
  await agenda.stop();
  process.exit(0);
};

// Helper function to clean up any jobs associated with a ride when it is deleted
agenda.cancelJobsAssociatedWithRide = async function (rideId) {
  const tasksToCancel = [
    "update number of completed rides",
    "send leave a review web notifications",
  ];
  tasksToCancel.forEach(async (task) => {
    await agenda.cancel({ name: task, data: { rideId } });
  });
};

// Schedule a task to run once, X hours after a certain date
agenda.scheduleJobHoursAfterDate = function (
  taskName,
  data,
  date,
  hoursAfterDate
) {
  return new Promise(async (resolve, reject) => {
    var scheduledDate = new Date(date);
    scheduledDate.setHours(scheduledDate.getHours() + hoursAfterDate);
    resolve(await agenda.schedule(scheduledDate, taskName, data));
  });
};

// Schedule a task to run once, X minutes after a certain date
agenda.scheduleJobMinutesAfterDate = function (
  taskName,
  data,
  date,
  minutesAfterDate
) {
  return new Promise(async (resolve, reject) => {
    var scheduledDate = new Date(date);
    scheduledDate.setMinutes(scheduledDate.getMinutes() + minutesAfterDate);
    resolve(await agenda.schedule(scheduledDate, taskName, data));
  });
};

process.on("SIGTERM", graceful);
process.on("SIGINT", graceful);

module.exports = agenda;
