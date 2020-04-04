const Ride = require('../ride/ride').Ride
const User = require('../user/user').User

const updateCompletedRidesTask = (rideId) => {
    return async function(){
      const completedRide = await Ride.findById(rideId)
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

module.exports = {
    updateCompletedRidesTask
}
