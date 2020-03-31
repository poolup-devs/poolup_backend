const Ride = require('../ride/ride').Ride
const User = require('../user/user').User

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
      // Driver gets notified to review passengers 
      const passengerNames = []
      rideDetails.passengers.forEach(async (passengerUsername) => {
        const passenger = await User.findOne({username: passengerUsername})
        passengerNames.append(passenger.name)
      })

      if (passengerNames.length == 1) {
        const noti = Noti.create({
          
        })
      }
    }
  }
}

// Get a list of users that need to be reviewed
const getUsersToReviewFromLatestRide = (username) => {
  return new Promise(async (resolve, reject) => {
      try {
          // Obtain latest ride details 
          Ride.findOne({$or: [{passengers: username}, {ownerUsername: username}], date: { $lt: new Date() } }, async (err, latestRide) => {
              if (!latestRide) {
                  return resolve({usernamesToReview: []})
              }
              const {passengers} = latestRide
              const rideId = latestRide._id
              const driverUsername = latestRide.ownerUsername
              // User was the driver for the ride 
              if (driverUsername === username) {
                  usernamesToReview = [] 
                  for (var i = 0; i < passengers.length; i++) {
                      //  Driver has not rated the passenger yet and has not declined a notification to do so 
                      if (!(await isExistingReview(username, passengers[i], rideId))) {
                          usernamesToReview.push(passengers[i])
                      }
                  }
                  resolve({usernamesToReview, rideId})
              }
              else {
                  // User was a passenger for this ride and has not reviewed the driver 
                  if (!(await isExistingReview(username, driverUsername, rideId))) {
                      resolve({usernamesToReview: [driverUsername], rideId})
                  }
                  else {
                      resolve({usernamesToReview: [], rideId})
                  }
              }
          }).sort({date: -1}).limit(1); 
      }
      catch(e) {
          console.log(e) 
      }
  })
}

module.exports = {
    updateCompletedRidesTask, 
    // createLeaveReviewNotiTask, 
}
