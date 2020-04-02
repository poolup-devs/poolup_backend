const Ride = require('../ride/ride').Ride
const User = require('../user/user').User
const Noti = require('../noti/noti').Noti
const Review = require('../review/review').Review
const declineReview = require('../review/controller').declineReview
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
      let passengerNames = []
      for (let i = 0; i < rideDetails.passengers.length; i++) {
        const passengerUsername = rideDetails.passengers[i]
        const passenger = await User.findOne({username: passengerUsername})
        passengerNames.push(passenger.name)                              
      }

      // Send a notification to the driver to review their passengers 
      const msg = await formatPassengerReviewMessage(passengerNames)
      await Noti.create({
        username: driverUsername, msg, redirectPath: process.env.MY_DRIVES_PATH
      })

      // Passengers each receive a notification to review driver
      const driverName = (await User.findOne({username: driverUsername})).name 

      for (let i = 0; i < rideDetails.passengers.length; i++) {
        const passengerUsername = rideDetails.passengers[i]
        await Noti.create({
          username: passengerUsername, 
          msg: `Leave a review for your driver, ${driverName}.`, 
          redirectPath: process.env.MY_RIDES_PATH
        })
        // Schedule the last day each passenger has to leave a review to the driver 
        scheduler.scheduleTaskHoursAfterDate(`expireAbilityToMakeReview.${rideId}.${passengerUsername}.${driverUsername}`, 
          expireAbilityToLeaveReviewTask(rideId, passengerUsername, driverUsername), 
          Date.now(), 
          24*7
        )   
        // Schedule the last day the driver has to leave a review to each passenger
        scheduler.scheduleTaskHoursAfterDate(`expireAbilityToMakeReview.${rideId}.${driverUsername}.${passengerUsername}`, 
          expireAbilityToLeaveReviewTask(rideId, driverUsername, passengerUsername), 
          Date.now(), 
          24*7
        )
      }
    }
  }
}

// Task to make unidirectional reviews visible and prevent users from leaving further reviews
const expireAbilityToLeaveReviewTask = (rideId, reviewerUsername, revieweeUsername) => {
  return async function() {
    const review = await Review.findOne({reviewerUsername, revieweeUsername, rideId})

    // Review exists, publish it for others to see and update the reviewee's rating 
    if (review) {
      review.isPublished = true 
      await review.save() 
      await User.findOneAndUpdate({username: review.revieweeUsername}, {$inc: {"rating.sumOfAllRatings": review.rating, "rating.totalRatings": 1}}) 
    }
    else {   
      // No review exists and the time to leave a review has run out, so prevent further reviews by declining it 
      try {
        await declineReview(reviewerUsername, revieweeUsername, rideId)
      }
      catch(e) {
        console.log(e) 
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
    createNotiToLeaveReviewTask,
    expireAbilityToLeaveReviewTask,
    formatPassengerReviewMessage, // for unit testing 
}
