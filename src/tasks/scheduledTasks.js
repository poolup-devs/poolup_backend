const Ride = require('../ride/ride').Ride
const User = require('../user/user').User
const Noti = require('../noti/noti').Noti

// A completed ride is one that hasn't been cancelled and contains at least one passenger
const isCompletedRide = (rideDetails) => {
  return new Promise(async (resolve, reject) => {
    return resolve(rideDetails && rideDetails.passengers.length > 0) 
  })
}

const updateCompletedRidesTask = (rideId) => {
    return async function(){
      const rideDetails = await Ride.findById(rideId)
      // At least a single passenger on the completed ride  
      if (await isCompletedRide(rideDetails)) {
        // Update the driver's number of completed rides based on the number of passengers dropped off 
        await User.findOneAndUpdate({username: rideDetails.ownerUsername},  {$inc: {ridesCompleted: rideDetails.passengers.length}})

        // Update each passenger's number of completed rides by 1 
        rideDetails.passengers.forEach(async (passenger) => {
          await User.findOneAndUpdate({username: passenger}, {$inc: {ridesCompleted: 1}})
        })
      }
    }
}

const createNotiToLeaveReviewTask = (rideId) => {
  return async function() {
    const rideDetails = await Ride.findById(rideId)
    if (await isCompletedRide(rideDetails)) {
      // Query for a list of passenger names to create driver notification 
      let passengerNames = []
      for (let i = 0; i < rideDetails.passengers.length; i++) {
        const passengerUsername = rideDetails.passengers[i]
        const passenger = await User.findOne({username: passengerUsername})
        passengerNames.push(passenger.name)
      }

      const msg = await formatPassengerReviewMessage(passengerNames)
      await Noti.create({
        username: rideDetails.ownerUsername, 
        msg,
        redirectPath: process.env.MY_DRIVES_PATH
      })

      // Passengers receive notification to review driver
      const driverName = (await User.findOne({username: rideDetails.ownerUsername})).name 
      rideDetails.passengers.forEach(async (passengerUsername) => {
        await Noti.create({
          username: passengerUsername, 
          msg: `Leave a review for your driver, ${driverName}.`, 
          redirectPath: process.env.MY_RIDES_PATH
        })
      })
    }
  }
}

const formatPassengerReviewMessage = (passengerNames) => {
  return new Promise((resolve, reject) => {
    if (passengerNames.length == 1) 
      return resolve(`Leave a review for your passenger, ${passengerNames[0]}.`)
    else if (passengerNames.length == 2) 
      return resolve(`Leave a review for your passengers, ${passengerNames[0]} and ${passengerNames[1]}.`)
    else {
      let message = "Leave a review for your passengers,"
      for (let i = 0; i < passengerNames.length; i++) {
        if (i == passengerNames.length - 1) {
          message += ` and ${passengerNames[i]}.`;
        }
        else {
          message += ` ${passengerNames[i]},`
        }
      }
      return resolve(message)
    }
  })
}

module.exports = {
    updateCompletedRidesTask, 
    formatPassengerReviewMessage, // for unit testing 
    createNotiToLeaveReviewTask 
}
