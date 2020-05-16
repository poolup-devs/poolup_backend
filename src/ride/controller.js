const Ride = require("./ride").Ride;
const Noti = require("../noti/noti").Noti;
const User = require("../user/user").User;
const Request = require("../request/request").Request;
const paymentHandler = require("../stripe/tool/payment-handler");
const ControllerException = require("../utils/errors/controllerException");
const agenda = require("../agenda/agenda");

const MY_DRIVES_PATH = process.env.MY_DRIVES_PATH;
const SEARCH_RIDES_PATH = process.env.SEARCH_RIDES_PATH;

///////////////////////////////////////////////////////////////
///////////GET RIDES///////////////////////////////////////////
///////////////////////////////////////////////////////////////
const createRideQueryFilter = (filter_) => {
  const places = require("./places.json");
  let filter = {};
  if (filter_ && Object.keys(filter_).length > 0) {
    try {
      filter_ = JSON.parse(filter_);
    } catch (err) {
      return reject(err);
    }
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
    return filter;
  } else {
    filter = { date: { $gte: new Date() } };
    return filter;
  }
};

const getMatchingRides = (filter_, pageNum) => {
  const filter = createRideQueryFilter(filter_);
  return new Promise(async (resolve, reject) => {
    try {
      const ride_res = await Ride.find(filter)
        .sort({ date: 1 })
        .skip(pageNum * 10)
        .limit(10);
      const matchingRides = await addDriverInfoToRides(ride_res);
      return resolve(matchingRides);
    } catch (err) {
      return reject(err);
    }
  });
};

const getRideHistory = (username) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ride_res = await Ride.find({
        passengers: username,
        date: { $lt: new Date() },
      })
        .sort({ date: 1 })
        .limit(5);
      return resolve(ride_res);
    } catch (err) {
      return reject(err);
    }
  });
};

const getMyRideHistory = (authUsername, pageNum) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ride_res = await Ride.find({
        passengers: authUsername,
        date: { $lt: new Date() },
      })
        .sort({ date: 1 })
        .skip(pageNum * 5)
        .limit(5);
      return resolve(ride_res);
    } catch (err) {
      return reject(err);
    }
  });
};

const getMyRideUpcoming = (authUsername) => {
  return new Promise(async (resovle, reject) => {
    try {
      const ride_res = await Ride.find({
        passengers: authUsername,
        date: { $gte: new Date() },
      })
        .sort({ date: 1 })
        .limit(3);
      const ridesUpcoming = await addDriverInfoToRides(ride_res);
      return resolve(ridesUpcoming);
    } catch (err) {
      return reject(err);
    }
  });
};

///////////////////////////////////////////////////////////////
///////////GET Drives//////////////////////////////////////////
///////////////////////////////////////////////////////////////

const getDriveHistory = (username) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ride_res = await Ride.find({
        ownerUsername: username,
        date: { $lt: new Date() },
      })
        .sort({ date: 1 })
        .skip(pageNum * 10)
        .limit(10);
      const driveHistory = await addDriverInfoToRides(ride_res);
      return resolve(driveHistory);
    } catch (err) {
      return reject(err);
    }
  });
};

const getDriveUpcoming = (username, pageNum) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ride_res = await Ride.find({
        ownerUsername: username,
        date: { $gte: new Date() },
      })
        .sort({ date: 1 })
        .skip(pageNum * 3)
        .limit(3);
      const upcomingDrives = await addDriverInfoToRides(ride_res);
      return resolve(upcomingDrives);
    } catch (err) {
      return reject(err);
    }
  });
};

const postRide = (rideInfo) => {
  return new Promise(async (resolve, reject) => {
    try {
      const newRide = await Ride.create(rideInfo);
      // Schedule jobs to occur after ride completion
      await agenda.scheduleJobHoursAfterDate(
        "update number of completed rides",
        { rideId: newRide._id },
        rideInfo.date,
        2
      );
      await agenda.scheduleJobHoursAfterDate(
        "send leave a review web notifications",
        { rideId: newRide._id },
        rideInfo.date,
        12
      );

      return resolve(newRide);
    } catch (err) {
      return reject(err);
    }
  });
};

const joinRide = (ownerUsername, ride_id, passengerUsername) => {
  return new Promise(async (resolve, reject) => {
    try {
      // TODO: weird username validation here
      const passenger = await User.findOne({ username: passengerUsername });
      if (passenger == null) {
        return reject(new ControllerException(404, "username not found"));
      }
      const noti = {
        username: ownerUsername,
        msg: `${passengerUsername} has joined your ride`,
        date: new Date(),
        redirectPath: MY_DRIVES_PATH,
      };
      const ride_upd = await Ride.findOneAndUpdate(
        { _id: ride_id, seats: { $gte: 1 } },
        { $push: { passengers: passengerUsername }, $inc: { seats: -1 } },
        { new: true }
      );
      if (ride_upd == null) {
        return reject(
          new ControllerException(
            400,
            "either the ride's id is not found, or the ride is full"
          )
        );
      }
      const noti_new = await Noti.create(noti);
      return resolve(ride_upd);
    } catch (err) {
      return reject(err);
    }
  });
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
        // Refund Passenger
        // TODO: Write Test
        // await paymentHandler.issueRefund(passengerUsername, rideId, "driver");

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
      await agenda.cancelJobsAssociatedWithRide(rideId);

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
      // Refund Passenger
      // TODO: Write Test
      // await paymentHandler.issueRefund(
      //   cancelledRideDoc.ownerUsername,
      //   rideId,
      //   "passenger"
      // );

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

const rideDetails = (_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ride_res = await Ride.findById(_id);
      if (ride_res == null) {
        return reject(new ControllerException(404, "ride not found"));
      }
      return resolve(ride_res);
    } catch (err) {
      return reject(err);
    }
  });
};

// Helper method to add driver information to each ride in a list of rides
const addDriverInfoToRides = (rides) => {
  return new Promise(async (resolve, reject) => {
    try {
      modifiedRides = [];
      for (const ride of rides) {
        const driver = await User.findOne({
          username: ride.ownerUsername,
        });
        var modifiedRide = ride.toObject();
        const { picUrl, picType, firstName, lastName } = driver;
        modifiedRide.picUrl = picUrl;
        modifiedRide.picType = picType;
        modifiedRide.firstName = firstName;
        modifiedRide.lastName = lastName;
        modifiedRides.push(modifiedRide);
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
  rideDetails,
};
