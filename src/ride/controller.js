const Ride = require("./ride").Ride;
const Noti = require("../noti/noti").Noti;
const User = require("../user/user").User;
const Request = require("../request/request").Request;
const scheduler = require("../tasks/scheduler");
const scheduledTasks = require("../tasks/scheduledTasks");

const MY_DRIVES_PATH = process.env.MY_DRIVES_PATH;
const SEARCH_RIDES_PATH = process.env.SEARCH_RIDES_PATH;

///////////////////////////////////////////////////////////////
///////////GET RIDES///////////////////////////////////////////
///////////////////////////////////////////////////////////////

const getMatchingRides = (filter_, pageNum, callback) => {
  const places = require("./places.json");

  if (filter_ && Object.keys(filter_).length > 0) {
    filter_ = JSON.parse(filter_);
    let filter = {};
    let fromCitiesQuery = [];
    let toCitiesQuery = [];
    let dateQuery = {};

    if (filter_.from && places[filter_.from] !== undefined) {
      let cities = places[filter_.from];

      for (var city of cities) {
        fromCitiesQuery.push({ from: city });
      }
    }

    if (filter_.to && places[filter_.to] !== undefined) {
      let cities = places[filter_.to];

      for (var city of cities) {
        toCitiesQuery.push({ to: city });
      }
    }

    if (filter_.date_from && filter_.date_to) {
      dateQuery = {
        date: {
          $gte: filter_.date_from,
          $lte: filter_.date_to,
        },
      };
    } else {
      dateQuery = {
        date: {
          $gte: new Date(),
        },
      };
    }

    filter = dateQuery;

    if (toCitiesQuery.length > 0 && fromCitiesQuery.length === 0) {
      filter = {
        $and: [{ $or: toCitiesQuery }, dateQuery],
      };
    } else if (toCitiesQuery.length === 0 && fromCitiesQuery.length > 0) {
      filter = {
        $and: [{ $or: fromCitiesQuery }, dateQuery],
      };
    } else if (toCitiesQuery.length > 0 && fromCitiesQuery.length > 0) {
      filter = {
        $and: [{ $or: fromCitiesQuery }, { $or: toCitiesQuery }, dateQuery],
      };
    }

    Ride.find(filter, async (err, result) => {
      if (err) {
        console.log(err);
        callback(err, null);
      } else {
        const matchingRides = await addDriverInfoToRides(result);
        callback(null, matchingRides);
      }
    })
      .sort({ date: 1 })
      .skip(pageNum * 10)
      .limit(10);
  } else {
    Ride.find({ date: { $gte: new Date() } }, async (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        const matchingRides = await addDriverInfoToRides(result);
        callback(null, matchingRides);
      }
    })
      .sort({ date: 1 })
      .skip(pageNum * 10)
      .limit(10);
  }
};

const getRideHistory = (username, callback) => {
  Ride.find(
    { passengers: username, date: { $lt: new Date() } },
    async (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        const rideHistory = await addDriverInfoToRides(result);
        callback(null, rideHistory);
      }
    }
  )
    .sort({ date: 1 })
    .limit(5);
};

const getMyRideHistory = (authUsername, pageNum, callback) => {
  Ride.find(
    { passengers: authUsername, date: { $lt: new Date() } },
    async (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        const rideHistory = await addDriverInfoToRides(result);
        callback(null, rideHistory);
      }
    }
  )
    .sort({ date: 1 })
    .skip(pageNum * 5)
    .limit(5);
};

const getMyRideUpcoming = (authUsername, callback) => {
  Ride.find(
    { passengers: authUsername, date: { $gte: new Date() } },
    async (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        const ridesUpcoming = await addDriverInfoToRides(result);
        callback(null, ridesUpcoming);
      }
    }
  )
    .sort({ date: 1 })
    .limit(3);
};

///////////////////////////////////////////////////////////////
///////////GET Drives//////////////////////////////////////////
///////////////////////////////////////////////////////////////

const getDriveHistory = (username, pageNum, callback) => {
  Ride.find(
    { ownerUsername: username, date: { $lt: new Date() } },
    async (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        const driveHistory = await addDriverInfoToRides(result);
        callback(null, driveHistory);
      }
    }
  )
    .sort({ date: 1 })
    .skip(pageNum * 10)
    .limit(10);
};

const getDriveUpcoming = (username, pageNum, callback) => {
  Ride.find(
    { ownerUsername: username, date: { $gte: new Date() } },
    async (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        const upcomingDrives = await addDriverInfoToRides(result);
        callback(null, upcomingDrives);
      }
    }
  )
    .sort({ date: 1 })
    .skip(pageNum * 3)
    .limit(3);
};

const postRide = async (rideInfo, callback) => {
  Ride.create(rideInfo, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      // Schedule a job that updates the number of completed rides for each user in the carpool that will occur 2 hours after the carpool begins
      scheduler.scheduleTaskHoursAfterDate(
        `updateCompletedRidesTask.${result._id}`,
        scheduledTasks.updateCompletedRidesTask(result._id),
        rideInfo.date,
        2
      );

      // Schedule a job that prompts users in the ride to leave reviews 12 hours after carpool begins
      scheduler.scheduleTaskHoursAfterDate(
        `createNotiToLeaveReviewTask.${result._id}`,
        scheduledTasks.createNotiToLeaveReviewTask(result._id),
        rideInfo.date,
        12
      );
      callback(null, result);
    }
  });
};

const joinRide = async (
  ownerUsername,
  ride_id,
  passengerUsername,
  callback
) => {
  const passenger = await User.findOne({ username: passengerUsername });
  const noti = {
    username: ownerUsername,
    msg: `${passengerUsername} has joined your ride`,
    date: new Date(),
    redirectPath: MY_DRIVES_PATH,
  };
  Ride.findOneAndUpdate(
    { _id: ride_id, seats: { $gte: 1 } },
    { $push: { passengers: passengerUsername }, $inc: { seats: -1 } },
    { new: true },
    (err1, result1) => {
      if (err1) {
        callback(err1, null);
      } else {
        Noti.create(noti, (err2, result2) => {
          if (err2) {
            callback(err2, null);
          } else {
            callback(null, result1);
          }
        });
      }
    }
  );
};

// Cancel a ride, whether the user was a driver or passenger
const cancelRide = (rideId, username, cancellationReason, messageToDriver) => {
  return new Promise(async (resolve, reject) => {
    const cancelledRideDoc = await Ride.findOne({ _id: rideId });
    if (!cancelledRideDoc) {
      return reject("Ride does not exist in database!");
    }

    // Driver cancellation
    if (username === cancelledRideDoc.ownerUsername) {
      let affectedUsers = cancelledRideDoc.passengers;
      const associatedRequests = await Request.find({ rideID: rideId });
      for (request of associatedRequests) {
        affectedUsers.push(request.requesterUsername);
      }

      // Notify all passengers/ requesters that the ride has been cancelled
      affectedUsers.forEach(async (passengerUsername) => {
        let noti = await Noti.create({
          username: passengerUsername,
          msg: `${username} has cancelled your ride`,
          date: new Date(),
          redirectPath: SEARCH_RIDES_PATH,
        });
        // Update schema-less property: additionalProperties
        noti.additionalProperties = { cancellationReason: cancellationReason };
        noti.markModified("additionalProperties");
        await noti.save();
      });

      // Delete all the requests
      await Request.deleteMany({ rideID: rideId });

      // Delete the ride
      await Ride.deleteOne({ _id: rideId });
      scheduler.cancelTasksAssociatedWithRide(rideId);
      // There are no passengers in the ride, so the driver can freely cancel without penalties
      if (cancelledRideDoc.passengers.length === 0) {
        return resolve(
          "Driver cancelled ride without penalty because there were no passengers."
        );
      } else {
        // Increment the user's number of cancelled rides
        await User.updateOne({ username }, { $inc: { ridesCancelled: 1 } });
        return resolve(
          "Driver cancelled ride and received a penalty because there were passengers."
        );
      }
    }

    // Passenger cancellation
    if (cancelledRideDoc.passengers.includes(username)) {
      // Notify driver of passenger cancellation
      let noti = await Noti.create({
        username: cancelledRideDoc.ownerUsername,
        msg: `${username} has cancelled your ride`,
        date: new Date(),
        redirectPath: MY_DRIVES_PATH,
      });
      // Update schema-less property: additionalProperties
      // If messageToDriver was not specified, the field will be set to null
      noti.additionalProperties = {
        cancellationReason: cancellationReason,
        messageToDriver: messageToDriver,
      };
      noti.markModified("additionalProperties");
      await noti.save();

      // Remove the passenger from the list of passengers and free up a spot
      await Ride.updateOne(
        { _id: rideId },
        { $pull: { passengers: username }, $inc: { seats: 1 } }
      );

      // Increment the user's number of cancelled rides
      await User.updateOne({ username }, { $inc: { ridesCancelled: 1 } });
      return resolve("Passenger cancelled ride and received a penalty.");
    }

    return reject("User is not a driver or passenger of this ride.");
  });
};

const rideDelete = (_id, callback) => {
  Ride.deleteOne({ _id }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

const rideDetails = (_id, callback) => {
  Ride.findOne({ _id }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// Helper method to add driver information to each ride in a list of rides
const addDriverInfoToRides = (rides) => {
  return new Promise(async (resolve, reject) => {
    try {
      let modifiedRides = JSON.parse(JSON.stringify(rides));
      for (i = 0; i < modifiedRides.length; i++) {
        const driver = await User.findOne({
          username: modifiedRides[i].ownerUsername,
        });
        const { picUrl, picType, firstName, lastName } = driver;
        modifiedRides[i].picUrl = picUrl;
        modifiedRides[i].picType = picType;
        modifiedRides[i].firstName = firstName;
        modifiedRides[i].lastName = lastName;
      }
      resolve(modifiedRides);
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {
  getMatchingRides,
  getRideHistory,
  getMyRideHistory,
  getMyRideUpcoming,
  getDriveHistory,
  getDriveUpcoming,
  postRide,
  joinRide,
  cancelRide,
  rideDelete,
  rideDetails,
};
