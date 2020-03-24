const Ride = require("./ride").Ride;
const Noti = require("../noti/noti").Noti;
const User = require("../user/user").User;
var schedule = require('node-schedule');



///////////////////////////////////////////////////////////////
///////////GET RIDES///////////////////////////////////////////
///////////////////////////////////////////////////////////////

const getMatchingRides = (filter_, pageNum, callback) => {
  if (filter_) {
    filter_ = JSON.parse(filter_);
    let filter = {};
    if (filter_.from) {
      filter.from = filter_.from;
    }
    if (filter_.to) {
      filter.to = filter_.to;
    }
    if (filter_.date_from && filter_.date_to) {
      filter.date = {
        $gte: filter_.date_from,
        $lte: filter_.date_to
      };
    } else {
      filter.date = {
        $gte: new Date()
      };
    }

    Ride.find(filter, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    })
      .sort({ date: 1 })
      .skip(pageNum * 10)
      .limit(10);
  } else {
    Ride.find({ date: { $gte: new Date() } }, (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
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
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  )
    .sort({ date: 1 })
    .limit(5);
};

const getMyRideHistory = (authUsername, pageNum, callback) => {
  Ride.find(
    { passengers: authUsername, date: { $lt: new Date() } },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
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
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  )
    .sort({ date: 1 })
    .limit(3);
};

///////////////////////////////////////////////////////////////
///////////GET Drives//////////////////////////////////////////
///////////////////////////////////////////////////////////////

const getDriveHistory = (username, callback) => {
  Ride.find(
    { ownerUsername: username, date: { $lt: new Date() } },
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
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
    (err, result) => {
      if (err) {
        callback(err, null);
      } else {
        callback(null, result);
      }
    }
  )
    .sort({ date: 1 })
    .skip(pageNum * 3)
    .limit(3);
};

const postRide = (rideInfo, callback) => {
  Ride.create(rideInfo, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      // Schedule a job that updates the number of completed rides for each user in the carpool 
      // Scheduled job will occur two hours after the carpool begins 
      var scheduledDate = new Date(rideInfo.date)
      scheduledDate.setHours(scheduledDate.getHours() + 2)      

      var job = schedule.scheduleJob(scheduledDate, updateCompletedRidesTask(result._id)) 
      callback(null, result);
    }
  });
};

const updateCompletedRidesTask = (rideId) => {
  return async function(){
    const completedRide = await Ride.findById(rideId)
    if (completedRide) {
      // At least a single passenger on the completed ride  
      if (completedRide.passengers.length > 0) {
        // Update the driver's number of completed rides based on the number of passengers dropped off 
        await User.findOneAndUpdate({username: completedRide.ownerUsername},  {$inc: {ridesCompleted: completedRide.passengers.length}})

        // Update each passenger's number of completed rides by 1 
        completedRide.passengers.forEach(async (passenger) => {
          await User.findOneAndUpdate({username: passenger}, {$inc: {ridesCompleted: 1}})
        })
      }
    }
  }
}

// const fetchMore = (multiplier, callback) => {
//   Ride.find({}, (err, result) => {
//     if (err) {
//       callback(err, null);
//     } else {
//       callback(null, result);
//     }
//   })
//     .sort({ _id: -1 })
//     .skip(multiplier * 18)
//     .limit(18);
// };

const joinRide = async (rideId, passengerUsername) => {
  return new Promise(async (resolve, reject) => {
    const passengerToAdd = await User.findOne({username: passengerUsername})
    const rideDetails = await Ride.findOneAndUpdate(
      { _id: rideId, seats: { $gte: 1 } },
      { $push: { passengers: passengerToAdd.username }, $inc: { seats: -1 } },
      { new: true }
    )

    await Noti.create({
      username: rideDetails.ownerUsername, 
      msg: `${passengerToAdd.username} has joined your ride`,
      senderEmail: passengerToAdd.email,
      date: new Date()
    })

    // Notify all other passengers 
    for (var i = 0; i < rideDetails.passengers.length; i++) {
      if (rideDetails.passengers[i] != passengerToAdd.username) {
        await Noti.create({
          username: rideDetails.passengers[i], 
          msg: `${passengerToAdd.username} has joined your ride`,
          senderEmail: passengerToAdd.email,
          date: new Date()
        })
      }
    }
    return resolve(rideDetails)
  })
};

// Cancel a ride, whether the user was a driver or passenger
const cancelRide = (rideId, username, cancellationReason, messageToDriver) => {
  return new Promise(async (resolve, reject) => {
    const cancelledRideDoc = await Ride.findOne({_id: rideId}) 
    if (!cancelledRideDoc) {
      return reject("Ride does not exist in database!")
    }
    
    const user = await User.findOne({username})
    // Driver cancellation 
    if (username === cancelledRideDoc.ownerUsername) {
      // Notify all passengers that the ride has been cancelled 
      cancelledRideDoc.passengers.forEach(async passengerUsername => {
        let noti = await Noti.create({
          username: passengerUsername, 
          msg: `${username} has cancelled your ride`, 
          senderEmail: user.email, 
          date: new Date() 
        })
        // Update schema-less property: additionalProperties
        noti.additionalProperties = {cancellationReason: cancellationReason}
        noti.markModified('additionalProperties')
        await noti.save() 
      })

      // Delete the ride 
      await Ride.deleteOne({_id: rideId})
      // There are no passengers in the ride, so the driver can freely cancel without penalties 
      if (cancelledRideDoc.passengers.length === 0) {
        return resolve("Driver cancelled ride without penalty because there were no passengers.") 
      }
      else {
        // Increment the user's number of cancelled rides 
        await User.updateOne({username}, {$inc: {ridesCancelled: 1}})
        return resolve("Driver cancelled ride and received a penalty because there were passengers.")
      }
    }

    // Passenger cancellation 
    if (cancelledRideDoc.passengers.includes(username)) {
      // Notify driver of passenger cancellation 
      let driverNoti = await Noti.create({
        username: cancelledRideDoc.ownerUsername,
        msg: `${username} has cancelled your ride`,
        senderEmail: user.email,
        date: new Date()
      })
      // Update schema-less property: additionalProperties
      // If messageToDriver was not specified, the field will be set to null 
      driverNoti.additionalProperties = {cancellationReason: cancellationReason, messageToDriver: messageToDriver}
      driverNoti.markModified('additionalProperties')
      await driverNoti.save() 

      // Notify all other passengers of cancellation 
      for (var i = 0; i < cancelledRideDoc.passengers.length; i++) {
        if (cancelledRideDoc.passengers[i] != username) {
          let passengerNoti = await Noti.create({
            username: cancelledRideDoc.passengers[i], 
            msg: `${username} has cancelled your ride`,
            senderEmail: user.email,
            date: new Date()
          })
          passengerNoti.additionalProperties = {cancellationReason: cancellationReason}
          passengerNoti.markModified('additionalProperties') 
          await passengerNoti.save() 
        }
      }
      
      // Remove the passenger from the list of passengers and free up a spot 
      await Ride.updateOne({_id: rideId}, {$inc: {seats: 1}, $pull: {passengers: username}})
      
      // Increment the user's number of cancelled rides 
      await User.updateOne({username}, {$inc: {ridesCancelled: 1}}) 
      return resolve("Passenger cancelled ride and received a penalty.")
    }

    return reject("User is not a driver or passenger of this ride.")
  })
}

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
  // Only for the testing suite
  updateCompletedRidesTask, 
};
