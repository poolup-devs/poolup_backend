const Ride = require('../ride/ride').Ride
const User = require('../user/user').User
const Noti = require('../noti/noti').Noti
const Review = require('../review/review').Review
const declineReview = require('../review/controller').declineReview
const makeReviewPublic = require('../review/controller').makeReviewPublic
const scheduler = require('./scheduler')

// Task to update the # completed rides for all users in a ride 
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

// Task to send a notification to all users in a ride to leave a review
const createNotiToLeaveReviewTask = (rideId) => {
  return async function() {
    const rideDetails = await Ride.findById(rideId)
    if (await isCompletedRide(rideDetails)) {
      const driverUsername = rideDetails.ownerUsername
      // Query for a list of passenger names to create driver notification 
      let passengerInfo = []
      for (let i = 0; i < rideDetails.passengers.length; i++) {
        const passengerUsername = rideDetails.passengers[i]
        const passenger = await User.findOne({username: passengerUsername})
        const {username, firstName, picUrl, picType} = passenger; 
        passengerInfo.push({username, firstName, picUrl, picType})                              
      }

      // Send a notification to the driver to review their passengers 
      const msg = await formatPassengerReviewMessage(passengerInfo.map(passenger => passenger.firstName))
      const notiToDriver = await Noti.create({
        username: driverUsername, 
        msg, 
        date: new Date(),
      })
      // Update schema-less property: additionalProperties to contain rideId and usersToReview
      notiToDriver.additionalProperties = {rideId, usersToReview: passengerInfo};
      notiToDriver.markModified("additionalProperties");
      await notiToDriver.save();

      // Passengers each receive a notification to review driver
      const driver = await User.findOne({username: driverUsername}).lean()
      const {username, firstName, picUrl, picType} = driver; 
      const driverInfo = {username, firstName, picUrl, picType} 
      for (let i = 0; i < rideDetails.passengers.length; i++) {
        const passengerUsername = rideDetails.passengers[i]
        const notiToPassenger = await Noti.create({
          username: passengerUsername, 
          msg: `Leave a review for your driver, ${driverInfo.firstName}.`, 
          date: new Date(),
        })
        // Update schema-less property: additionalProperties to contain rideId and driverInfo
        notiToPassenger.additionalProperties = {rideId, usersToReview: [driverInfo]};
        notiToPassenger.markModified("additionalProperties");
        await notiToPassenger.save();

        // Schedule the last day passengers and drivers have to leave reviews 
        scheduler.scheduleTaskHoursAfterDate(`expireAbilityToLeaveReviewTask.${rideId}.${driverUsername}.${passengerUsername}`, 
          expireAbilityToLeaveReviewTask(rideId, driverUsername, passengerUsername), 
          Date.now(), 
          24*7
        )   
      }
    }
  }
}

// Task to make unidirectional reviews visible and prevent users from leaving further reviews
const expireAbilityToLeaveReviewTask = (rideId, driverUsername, passengerUsername) => {
  return async function() {
    const driverReviewToPassenger = await Review.findOne({rideId, reviewerUsername: driverUsername, revieweeUsername: passengerUsername})
    const passengerReviewToDriver = await Review.findOne({rideId, reviewerUsername: passengerUsername, revieweeUsername: driverUsername})

    // 1. Both driver and passenger did not leave reviews, so expire their ability to leave a review for each other 
    if (!driverReviewToPassenger && !passengerReviewToDriver) {
      await declineReview(rideId, driverUsername, passengerUsername) 
      await declineReview(rideId, passengerUsername, driverUsername)
    }
    else {
      // 2. One of them left a review but the other didn't 
      if (driverReviewToPassenger) {
        // Driver has left a review to the passenger, so make it public, and expire the passenger's ability to leave a review for driver 
        await makeReviewPublic(rideId, driverUsername, passengerUsername)
        await declineReview(rideId, passengerUsername, driverUsername) 
      } 
      else {
        // Passenger left review to the driver, so make it public, and expire the driver's ability to leave a review for passenger 
        await makeReviewPublic(rideId, passengerUsername, driverUsername)
        await declineReview(rideId, driverUsername, passengerUsername)
      }
    }
  }
}

// A completed ride is one that hasn't been cancelled and contains at least one passenger
const isCompletedRide = (rideDetails) => {
  return new Promise(async (resolve, reject) => {
    return resolve(rideDetails && rideDetails.passengers.length > 0) 
  })
}

// Format the "Leave a review for your passenger(s)" message that the driver receives depending on the number of passengers in the ride 
const formatPassengerReviewMessage = (passengerFirstNames) => {
  return new Promise((resolve, reject) => {
    if (passengerFirstNames.length == 1) 
      return resolve(`Leave a review for your passenger, ${passengerFirstNames[0]}.`)
    else if (passengerFirstNames.length == 2) 
      return resolve(`Leave a review for your passengers, ${passengerFirstNames[0]} and ${passengerFirstNames[1]}.`)
    else {
      let message = "Leave a review for your passengers,"
      for (let i = 0; i < passengerFirstNames.length; i++) {
        if (i == passengerFirstNames.length - 1) {
          message += ` and ${passengerFirstNames[i]}.`;
        }
        else {
          message += ` ${passengerFirstNames[i]},`
        }
      }
      return resolve(message)
    }
  })
}

module.exports = {
    updateCompletedRidesTask, 
    createNotiToLeaveReviewTask,
    expireAbilityToLeaveReviewTask,
    formatPassengerReviewMessage, // for unit testing 
}
