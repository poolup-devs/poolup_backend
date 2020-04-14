const Request = require("./request").Request;
const User = require("../user/user").User;
const Noti = require("../noti/noti").Noti;
const Ride = require("../ride/ride").Ride;
const mongoose = require("mongoose");

const MY_REQUESTS_PATH = process.env.MY_REQUESTS_PATH;
const SEARCH_RIDES_PATH = process.env.SEARCH_RIDES_PATH;

// getRequestInfo gets the information of a specified request
const getRequestInfo = (requestID, callback) => {
  let query = { _id: requestID };

  Request.find(query, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// getSenderRequests gets a sender's requests based on status
const getSenderRequests = (senderID, status, callback) => {
  let query = {};

  if (status == "all") {
    query = { senderID: senderID };
  } else if (status == "visible") {
    query = {
      senderID: senderID,
      archived: false
    };
  } else {
    query = { senderID: senderID, status: status };
  }

  Request.find(query, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// getrecipientRequests gets recipient requests based off status
const getRecipientRequests = (recipientID, status, callback) => {
  let query = {};

  if (status == "all") {
    query = { recipientID: recipientID };
  } else if (status == "visible") {
    query = {
      recipientID: recipientID,
      archived: false
    };
  } else {
    query = { recipientID: recipientID, status: status };
  }

  Request.find(query, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// Check to see if a request already exists for the sender, receipient, and rider
const doesRequestExist = requestInfo => {
  return new Promise(async (resolve, reject) => {
    Request.findOne(
      {
        rideID: requestInfo.rideID,
        senderID: requestInfo.senderID,
        recipientID: requestInfo.recipientID,
        status: "pending"
      },
      (err, result) => {
        if (err) {
          reject(err);
        }

        // A request for this ride and user was found
        if (result) {
          resolve(true);
          return;
        } else {
          resolve(false);
          return;
        }
      }
    );
  });
};

const isAlreadyInRide = requestInfo => {
  return new Promise(async (resolve, reject) => {
    Ride.find({passengers: requestInfo.senderID}, (err, res) => {
      if (err) {
        reject(err);
      }
      if (res.length!=0) {
        resolve(true);
        return;
      } else {
        resolve(false);
        return;
      }
    })
  });
}

// createRequest creates a new request from the specified user with
// regards about the specified ride
const createRequest = async (requestInfo, callback) => {
  //Check to see if a request has already been sent by this user and ride
  try {
    const req_res = await doesRequestExist(requestInfo);
    const ride_res = await isAlreadyInRide(requestInfo);
    if (req_res) {
      callback(
        new Error("A request has already been created for this ride"),
        null
      );
      return;
    } else if (ride_res) {
      callback(
        new Error("The user is already in this ride"),
        null
      );
      return;
    }
  } catch (err) {
    callback(err, null);
    return;
  }

  const newRequest = {
    rideID: requestInfo.rideID,
    senderID: requestInfo.senderID,
    recipientID: requestInfo.recipientID,
    carryOn: requestInfo.carryOn,
    luggage: requestInfo.luggage,
    msg: requestInfo.msg,
    date: new Date()
  };

  try {
    const ride = await Ride.findById(newRequest.rideID);
    const result = await Request.create(newRequest);
    await Noti.create({
      username: newRequest.recipientID,
      msg: `${newRequest.senderID} is requesting a spot on your trip from ${ride.from} to ${ride.to}`,
      date: new Date(),
      redirectPath: MY_REQUESTS_PATH
    });
    
    callback(null, result);
    return;
  } catch(e) {
    callback(e, null);
    return;
  }
};

// approveRequest sets a specified request's status to 'approved'
const approveRequest = async (requestID, callback) => {
  const filter = { _id: requestID };
  const update = { $set: { status: "approved" } };
  const options = { new: true };

  try {
    let request = await Request.findOne(filter);
    if (!request) { callback("Specified request not found", null); }
    else if (request.archived) {
      callback("Ride has already been archived");
    } else if (request.status !== "pending") {
      callback("Ride has already been " + request.status, null);
    } else {
      request = await Request.findOneAndUpdate(filter, update, options);
      const user = await User.findOne({username: request.recipientID});
      await Noti.create({
        username: request.senderID,
        msg: `${user.username} has accepted you ride request`,
        date: new Date(),
        redirectPath: MY_REQUESTS_PATH
      });

      callback(null, request);
      return;
    }
  } catch (err) {
    callback(err, null);
    return;
  }
};

// denyRequest sets a specified request status to 'denied'
const denyRequest = async (requestID, callback) => {
  const filter = { _id: requestID };
  const update = { $set: { status: "denied" } };
  const options = { new: true };

  try {
    let request = await Request.findOne(filter);
    if (!request) { callback("Specified request not found", null); }
    else if (request.archived) {
      callback("Ride has already been archived");
    } else if (request.status !== "pending") {
      callback("Ride has already been " + request.status, null);
    } else {
      request = await Request.findOneAndUpdate(filter, update, options);
      const user = await User.findOne({username: request.recipientID});
      await Noti.create({
        username: request.senderID,
        msg: `Your request to join ${user.username}'s ride has been denied`,
        date: new Date(),
        redirectPath: SEARCH_RIDES_PATH
      });

      callback(null, request);
      return;
    }
  } catch (err) {
    callback(err, null);
    return;
  }
};

// cancelRequest sets a specified request's status to 'cancelled'
const cancelRequest = async (requestID, callback) => {
  const filter = { _id: requestID };
  const update = { $set: { status: "cancelled" } };
  const options = { new: true };

  try {
    let request = await Request.findOne(filter);
    console.log(request)
    if (!request) { callback("Specified request not found", null); }
    else if (request.archived) {
      callback("Ride has already been archived");
    } else if (request.status !== "pending") {
      callback("Ride has already been " + request.status, null);
    } else {
      request = await Request.findOneAndUpdate(filter, update, options);
      await Noti.create({
        username: request.recipientID,
        msg: `${request.senderID}'s request for your ride has been cancelled`,
        date: new Date(),
        redirectPath: SEARCH_RIDES_PATH
      });

      callback(null, request);
      return;
    }
  } catch (err) {
    callback(err, null);
    return;
  }

  // Request.findOne(filter, (findErr, findResult) => {
  //   if (findErr) {
  //     callback(findErr, null);
  //   } else {
  //     if (findResult.archived) {
  //       callback("Ride has already been archived");
  //     } else if (findResult.status !== "pending") {
  //       callback("Ride has already been " + findResult.status, null);
  //     } else {
  //       Request.findOneAndUpdate(
  //         filter,
  //         update,
  //         options,
  //         (updateErr, updateResult) => {
  //           if (updateErr) {
  //             callback(updateErr, null);
  //           } else {
  //             callback(null, updateResult);
  //           }
  //         }
  //       );
  //     }
  //   }
  // });


};

// archiveRequest sets a specified request archived field to true
const archiveRequest = (requestID, callback) => {
  const filter = { _id: requestID };
  const update = { $set: { archived: true } };
  const options = { new: true };

  Request.findOneAndUpdate(filter, update, options, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// archiveRequest sets a specified request archived field to false
const unarchiveRequest = (requestID, callback) => {
  const filter = { _id: requestID };
  const update = { $set: { archived: false } };
  const options = { new: true };

  Request.findOneAndUpdate(filter, update, options, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// deleteRequest deletes a specified request from the database
const deleteRequest = (requestID, callback) => {
  Request.deleteOne({ _id: requestID }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// decrementRemindCount decrements the reminders count by one
const decrementRemindCount = (requestID, callback) => {
  console.log(requestID);
  const filter = { _id: requestID };
  const update = { $inc: { reminders: -1 } };
  const options = { new: true };

  Request.findOneAndUpdate(
    filter,
    update,
    options,
    (updateErr, updateResult) => {
      if (updateErr) {
        callback(updateErr, null);
      } else {
        callback(null, updateResult);
      }
    }
  );
};

module.exports = {
  getRequestInfo,
  getRecipientRequests,
  getSenderRequests,
  createRequest,
  approveRequest,
  cancelRequest,
  denyRequest,
  archiveRequest,
  unarchiveRequest,
  deleteRequest,
  decrementRemindCount
};
