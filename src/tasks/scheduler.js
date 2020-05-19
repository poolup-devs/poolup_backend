var schedule = require("node-schedule");

// Schedule a task to run once, X hours after a certain date
const scheduleTaskHoursAfterDate = (uniqueTaskName, task, date, hours) => {
  var scheduledDate = new Date(date);
  scheduledDate.setHours(scheduledDate.getHours() + hours);
  console.log("Scheduled date: " + scheduledDate);
  schedule.scheduleJob(uniqueTaskName, scheduledDate, function () {
    task;
  });
};

// Schedule a task to run once, X hours after a certain date
const scheduleTaskMinutesAfterDate = (uniqueTaskName, task, date, minutes) => {
  var scheduledDate = new Date(date);
  scheduledDate.setMinutes(scheduledDate.getMinutes() + minutes);
  schedule.scheduleJob(uniqueTaskName, scheduledDate, function () {
    task;
  });
};

const cancelTask = (taskName) => {
  return new Promise((resolve, reject) => {
    const task = schedule.scheduledJobs[taskName];
    if (!task) {
      resolve(true);
    }
    resolve(task.cancel());
  });
};

// Clean up all tasks associated with a ride, such as when a ride is cancelled and deleted
const cancelTasksAssociatedWithRide = (rideId) => {
  const tasksToCancel = [
    `updateCompletedRidesTask.${rideId}`,
    `createNotiToLeaveReviewTask.${rideId}`,
    `archiveRemainingRideRequests.${rideId}`,
  ];
  tasksToCancel.forEach((task) => {
    cancelTask(task);
  });
};

module.exports = {
  scheduleTaskHoursAfterDate,
  scheduleTaskMinutesAfterDate,
  cancelTask,
  cancelTasksAssociatedWithRide,
};
