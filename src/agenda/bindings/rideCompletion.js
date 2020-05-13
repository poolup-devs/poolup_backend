const RideCompletionJobs = require("../jobs/rideCompletionJobs");

module.exports = (agenda) => {
  /* Task to update the number of completed rides in a ride */
  agenda.define("update number of completed rides", async (job, done) => {
    await RideCompletionJobs.updateCompletedRidesTask(job.attrs.data.rideId);
    done();
  });

  /* Task to send a notification to all users in a ride to leave a review */
  agenda.define("send leave a review web notifications", async (job, done) => {
    await RideCompletionJobs.createNotiToLeaveReviewTask(job.attrs.data.rideId);
    done();
  });

  /* Task to make unidirectional reviews visible and prevent users from leaving further reviews */
  agenda.define("expire ability to leave review", async (job, done) => {
    const { rideId, driverUsername, passengerUsername } = job.attrs.data;
    await RideCompletionJobs.expireAbilityToLeaveReviewTask(
      rideId,
      driverUsername,
      passengerUsername
    );
    done();
  });
};
