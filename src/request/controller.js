const Request = require("./request").Request;
const User = require("../user/user").User;
const Noti = require("../noti/noti").Noti;
const Ride = require("../ride/ride").Ride;
const mongoose = require("mongoose");

const MY_REQUESTS_PATH = process.env.MY_REQUESTS_PATH;
const SEARCH_RIDES_PATH = process.env.SEARCH_RIDES_PATH;

// getRequestInfo gets the information of a specified request
const getRequestInfo = async (requestID) => {
  let query = { _id: requestID };
  return new Promise(async (resolve, reject) => {
    try {
      console.log("here")
      const res = await Request.findById(query);
      return resolve(res);
    } catch(err) {
      return reject(err);
    }
  })
};

// getRequesterRequests gets a requester's requests based on status
const getRequesterRequests = (requesterUsername, status) => {
  let query = {};
  if (status == "all") {
    query = { requesterUsername: requesterUsername };
  } else if (status == "visible") {
    query = {
      requesterUsername: requesterUsername,
      archived: false
    };
  } else {
    query = { requesterUsername: requesterUsername, status: status };
  }

  return new Promise(async (resolve, reject) => {
    try {
      const res = await Request.find(query);
      console.log(res)
      return resolve(res);
    } catch(err) {
      return reject(err);
    }
  })
};

// getRequesteeRequests gets requestee requests based off status
const getRequesteeRequests = (requesteeUsername, status) => {
  let query = {};
  if (status == "all") {
    query = { requesteeUsername: requesteeUsername };
  } else if (status == "visible") {
    query = {
      requesteeUsername: requesteeUsername,
      archived: false
    };
  } else {
    query = { requesteeUsername: requesteeUsername, status: status };
  }

  return new Promise(async (resolve, reject) => {
    try {
      const res = await Request.find(query);
      return resolve(res);
    } catch(err) {
      return reject(err);
    }
  })

  // Request.find(query, (err, result) => {
  //   if (err) {
  //     callback(err, null);
  //   } else {
  //     callback(null, result);
  //   }
  // });
};

// Check to see if a request already exists for the requester, receipient, and rider
const doesRequestExist = requestInfo => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await Request.findOne(
        {
          rideID: requestInfo.rideID,
          requesterUsername: requestInfo.requesterUsername,
          requesteeUsername: requestInfo.requesteeUsername,
          status: "pending"
        });
      if(res) { return resolve(true); }
      else { return resolve(false); }
    } catch(err) {
      return reject(err);
    }
  });


  //   Request.findOne(
  //     {
  //       rideID: requestInfo.rideID,
  //       requesterUsername: requestInfo.requesterUsername,
  //       requesteeUsername: requestInfo.requesteeUsername,
  //       status: "pending"
  //     },
  //     (err, result) => {
  //       if (err) {
  //         reject(err);
  //       }

  //       // A request for this ride and user was found
  //       if (result) {
  //         resolve(true);
  //         return;
  //       } else {
  //         resolve(false);
  //         return;
  //       }
  //     }
  //   );
  // });
};

const isAlreadyInRide = requestInfo => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await Ride.find({_id: requestInfo.rideID, passengers: requestInfo.requesterUsername});
      if( res.length!=0 ) 
        { return resolve(true); }
      else 
        { return resolve(false); }
    } catch(err) {
      return reject(err);
    }

    // Ride.find({passengers: requestInfo.requesterUsername}, (err, res) => {
    //   if (err) {
    //     reject(err);
    //   }
    //   if (res.length!=0) {
    //     resolve(true);
    //     return;
    //   } else {
    //     resolve(false);
    //     return;
    //   }
    // })
  });
}

// createRequest creates a new request from the specified user with
// regards about the specified ride
const createRequest = async (requestInfo) => {
  //Check to see if a request has already been sent by this user and ride
  return new Promise( async(resolve, reject) => {
    try {
      const req_res = await doesRequestExist(requestInfo);
      const ride_res = await isAlreadyInRide(requestInfo);
      if (req_res) 
        { throw "A request has already been created for this ride"; } 
      else if (ride_res) 
        { throw "The user is already in this ride"; }
    } catch (err) {
      return reject(err);
    }
  
    const newRequest = {
      rideID: requestInfo.rideID,
      requesterUsername: requestInfo.requesterUsername,
      requesteeUsername: requestInfo.requesteeUsername,
      carryOn: requestInfo.carryOn,
      luggage: requestInfo.luggage,
      msg: requestInfo.msg,
      date: new Date()
    };
  
    try {
      const ride_res = await Ride.findById(newRequest.rideID);
      const request_new = await Request.create(newRequest);
      await Noti.create({
        username: newRequest.requesteeUsername,
        msg: `${newRequest.requesterUsername} is requesting a spot on your trip from ${ride_res.from} to ${ride_res.to}`,
        date: new Date(),
        redirectPath: MY_REQUESTS_PATH
      });
      return resolve(request_new);
    } catch(err) {
      return reject(err);
    }
  })
};

// update status of request to either "approved", "denied", or "cancelled"
const updateRequestStatus = async (requestID, authUsername, status) => {
  const filter = { _id: requestID };
  const update = { $set: { status: status } };
  const options = { new: true };

  return new Promise(async(resolve, reject) => {
    try {
      let request_res = await Request.findOne(filter);
      if (!request_res) 
        { throw "Specified request not found"; }
      else if (request_res.archived) 
        { throw "Ride has already been archived"; } 
      else if (request_res.status !== "pending") 
        { throw "Ride has already been " + request_res.status; } 
      else {
        // switch
        switch(status){
          case "approved": {
            if( authUsername != request_res.requesteeUsername ) { throw "Unauthorized request action: You are not the requestee"}
            request_upd = await Request.findOneAndUpdate(filter, update, options);
            const user = await User.findOne({username: request_upd.requesteeUsername});
            await Ride.findByIdAndUpdate({_id: request_upd.rideID}, {$addToSet: {passengers: request_upd.requesterUsername}}, {new: true});
            await Noti.create({
              username: request_upd.requesterUsername,
              msg: `${user.username} has accepted you ride request`,
              date: new Date(),
              redirectPath: MY_REQUESTS_PATH
            });
            break;
          }
          case "denied": {
            if( authUsername != request_res.requesteeUsername ) { throw "Unauthorized request action: You are not the requestee"}
            request_upd = await Request.findOneAndUpdate(filter, update, options);
            const user = await User.findOne({username: request_upd.requesteeUsername});
            await Noti.create({
              username: request_upd.requesterUsername,
              msg: `Your request to join ${user.username}'s ride has been denied`,
              date: new Date(),
              redirectPath: SEARCH_RIDES_PATH
            });
            break;
          }
          case "cancelled": {
            if( authUsername != request_res.requesterUsername ) { throw "Unauthorized request action: You are not the requester"}
            request_upd = await Request.findOneAndUpdate(filter, update, options);
            await Noti.create({
              username: request_upd.requesteeUsername,
              msg: `${request_upd.requesterUsername}'s request for your ride has been cancelled`,
              date: new Date(),
              redirectPath: SEARCH_RIDES_PATH
            });
            break;
          }
          default: {
            throw "invalid status to update";
          }
        }
        return resolve(request_upd);
      }
    } catch (err) {
      return reject(err);
    }
  });
};

// archiveRequest sets a specified request archived field to true
const archiveRequest = (requestID) => {
  const filter = { _id: requestID };
  const update = { $set: { archived: true } };
  const options = { new: true };
  return new Promise(async (resolve, reject) => {
    try {
      const request_upd = await Request.findOneAndUpdate(filter, update, options);
      return resolve(request_upd);
    } catch (err) {
      return reject(err);
    }
  });
};

// archiveRequest sets a specified request archived field to false
const unarchiveRequest = (requestID) => {
  const filter = { _id: requestID };
  const update = { $set: { archived: false } };
  const options = { new: true };

  return new Promise(async (resolve, reject) => {
    try {
      const request_upd = await Request.findOneAndUpdate(filter, update, options);
      return resolve(request_upd);
    } catch (err) {
      return reject(err);
    }
  });
};

// // deleteRequest deletes a specified request from the database
// const deleteRequest = (requestID, callback) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       const request_del = await Request.deleteOne({ _id: requestID });
//       return resolve(request_del);
//     } catch(err) {
//       return reject(err);
//     }
//   })
// };

// decrementRemindCount decrements the reminders count by one
const decrementRemindCount = (requestID, authUsername) => {
  const filter = { _id: requestID };
  const update = { $inc: { reminders: -1 } };
  const options = { new: true };

  return new Promise(async (resolve, reject) => {
    try {
      const request_res = await Request.findById(filter);
      if(request_res.requesteeUsername != authUsername) 
        { throw "Unauthorized request action: You are not the requestee"; } 
      else if (request_res.reminders < 1)
        { throw "Reminder count is already less than 1"; }
      const request_upd = await Request.findOneAndUpdate(
        filter,
        update,
        options);
      return resolve(request_upd);
    } catch(err) {
      return reject(err);
    }
  })
};

module.exports = {
  getRequestInfo,
  getRequesteeRequests,
  getRequesterRequests,
  createRequest,
  updateRequestStatus,
  archiveRequest,
  unarchiveRequest,
  // deleteRequest,
  decrementRemindCount
};
