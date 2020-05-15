const Request = require("./request").Request;
const User = require("../user/user").User;
const Noti = require("../noti/noti").Noti;
const Ride = require("../ride/ride").Ride;
const mongoose = require("mongoose");

const Error = require("../utils/error-model");

const MY_DRIVES_PATH = process.env.MY_DRIVES_PATH;
const MY_RIDES_PATH = process.env.MY_RIDES_PATH;
const SEARCH_RIDES_PATH = process.env.SEARCH_RIDES_PATH;

// getRequestInfo gets the information of a specified request
const getRequestInfo = async (requestID) => {
  let query = { _id: requestID };
  return new Promise(async (resolve, reject) => {
    try {
      const res = await Request.findById(query);
      if (res == null) {
        return reject(Error(404, "ride of ride_id not found"));
      }
      return resolve(res);
    } catch (err) {
      return reject(Error(500));
    }
  });
};

// getRequesterRequests gets a requester's requests based on status
const getRequesterRequests = (requesterUsername, status) => {
  let query = {};
  if (status == "all") {
    query = { requesterUsername: requesterUsername };
  } else if (status == "visible") {
    query = {
      requesterUsername: requesterUsername,
      archived: false,
    };
  } else {
    query = { requesterUsername: requesterUsername, status: status };
  }

  return new Promise(async (resolve, reject) => {
    try {
      const requesterUser = await User.find({ username: requesterUsername });
      if (requesterUser.length == 0) {
        return reject(Error(404));
      }

      const res = await Request.find(query);
      return resolve(res);
    } catch (err) {
      return reject(Error(500));
    }
  });
};

// getRequesteeRequests gets requestee requests based off status
const getRequesteeRequests = (requesteeUsername, status) => {
  let query = {};
  if (status == "all") {
    query = { requesteeUsername: requesteeUsername };
  } else if (status == "visible") {
    query = {
      requesteeUsername: requesteeUsername,
      archived: false,
    };
  } else {
    query = { requesteeUsername: requesteeUsername, status: status };
  }

  return new Promise(async (resolve, reject) => {
    try {
      const requesterUser = await User.find({ username: requesteeUsername });
      if (requesterUser.length == 0) {
        return reject(Error(404));
      }

      const res = await Request.find(query);
      return resolve(res);
    } catch (err) {
      return reject(Error(500));
    }
  });
};

// createRequest creates a new request from the specified user with
// regards about the specified ride
const createRequest = async (requestInfo) => {
  //Check to see if a request has already been sent by this user and ride
  return new Promise(async (resolve, reject) => {
    try {
      const req_res = await doesRequestExist(requestInfo);
      const ride_res = await isAlreadyInRide(requestInfo);
      if (req_res) {
        throw "A request has already been created for this ride";
      } else if (ride_res) {
        throw "The user is already in this ride";
      }
    } catch (err) {
      return reject(Error(400, err));
    }

    const newRequest = {
      rideID: requestInfo.rideID,
      requesterUsername: requestInfo.requesterUsername,
      requesteeUsername: requestInfo.requesteeUsername,
      carryOn: requestInfo.carryOn,
      luggage: requestInfo.luggage,
      msg: requestInfo.msg,
      date: new Date(),
    };

    try {
      const ride_res = await Ride.findById(newRequest.rideID);
      const requesterUsername_res = await User.find({
        username: newRequest.requesterUsername,
      });
      const requesteeUsername_res = await User.find({
        username: newRequest.requesteeUsername,
      });

      if (ride_res == null) {
        throw "ride with rideID not found";
      }
      if (requesterUsername_res.length == 0) {
        throw "specified requesterUsername not found";
      }
      if (requesteeUsername_res.length == 0) {
        throw "specified requesteeUsername not found";
      }
    } catch (err) {
      return reject(Error(404, err));
    }

    try {
      const ride_res = await Ride.findById(newRequest.rideID);
      const request_new = await Request.create(newRequest);
      await Noti.create({
        username: newRequest.requesteeUsername,
        msg: `${newRequest.requesterUsername} is requesting a spot on your trip from ${ride_res.from} to ${ride_res.to}`,
        date: new Date(),
        redirectPath: MY_DRIVES_PATH,
      });
      return resolve(request_new);
    } catch (err) {
      return reject(Error(500));
    }
  });
};

// update status of request to either "approved", "denied", or "cancelled"
const updateRequestStatus = async (requestID, authUsername, status) => {
  const filter = { _id: requestID };
  const update = { $set: { status: status } };
  const options = { new: true };
  let errFlag = 0;

  return new Promise(async (resolve, reject) => {
    try {
      const request_res = await Request.findOne(filter);
      if (request_res == null) {
        reject(404);
      }
    } catch (err) {
      return reject(Error(500));
    }
    try {
      let request_res = await Request.findOne(filter);
      if (!request_res) {
        errFlag = 404;
        throw "Specified request not found";
      } else if (request_res.archived) {
        errFlag = 400;
        throw "Ride has already been archived";
      } else if (request_res.status !== "pending") {
        errFlag = 400;
        throw "Ride has already been " + request_res.status;
      } else {
        // switch
        switch (status) {
          case "approved": {
            if (authUsername != request_res.requesteeUsername) {
              errFlag = 401;
              throw "Unauthorized request action: You are not the requestee";
            }
            request_upd = await Request.findOneAndUpdate(
              filter,
              update,
              options
            );
            const user = await User.findOne({
              username: request_upd.requesteeUsername,
            });
            await Ride.findByIdAndUpdate(
              { _id: request_upd.rideID },
              { $addToSet: { passengers: request_upd.requesterUsername } },
              { new: true }
            );
            await Noti.create({
              username: request_upd.requesterUsername,
              msg: `${user.username} has accepted your ride request`,
              date: new Date(),
              redirectPath: MY_RIDES_PATH,
            });
            break;
          }
          case "denied": {
            if (authUsername != request_res.requesteeUsername) {
              errFlag = 401;
              throw "Unauthorized request action: You are not the requestee";
            }
            request_upd = await Request.findOneAndUpdate(
              filter,
              update,
              options
            );
            const user = await User.findOne({
              username: request_upd.requesteeUsername,
            });
            await Noti.create({
              username: request_upd.requesterUsername,
              msg: `Your request to join ${user.username}'s ride has been denied`,
              date: new Date(),
              redirectPath: MY_RIDES_PATH,
            });
            break;
          }
          case "cancelled": {
            if (authUsername != request_res.requesterUsername) {
              errFlag = 401;
              throw "Unauthorized request action: You are not the requester";
            }
            request_upd = await Request.findOneAndUpdate(
              filter,
              update,
              options
            );
            await Noti.create({
              username: request_upd.requesteeUsername,
              msg: `${request_upd.requesterUsername}'s request for your ride has been withdrawn`,
              date: new Date(),
              redirectPath: MY_DRIVES_PATH,
            });
            break;
          }
          case "paid": {
            if (authUsername != request_res.requesterUsername) {
              errFlag = 401;
              throw "Unauthorized request action: You are not the requester";
            }
            request_upd = await Request.findOneAndUpdate(
              filter,
              update,
              options
            );
            await Noti.create({
              username: request_upd.requesteeUsername,
              msg: `${request_upd.requesterUsername}'s request for your ride has been paid`,
              date: new Date(),
              redirectPath: MY_DRIVES_PATH,
            });
            break;
          }
          default: {
            errFlag = 400;
            throw "invalid status to update";
          }
        }
        return resolve(request_upd);
      }
    } catch (err) {
      if (errFlag) {
        return reject(Error(errFlag, err));
      }
      return reject(Error(500));
    }
  });
};

// Check to see if a request already exists for the requester, receipient, and rider
const doesRequestExist = (requestInfo) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await Request.findOne({
        rideID: requestInfo.rideID,
        requesterUsername: requestInfo.requesterUsername,
        requesteeUsername: requestInfo.requesteeUsername,
        status: "pending",
      });
      if (res) {
        return resolve(true);
      } else {
        return resolve(false);
      }
    } catch (err) {
      return reject(err);
    }
  });
};

const isAlreadyInRide = (requestInfo) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await Ride.find({
        _id: requestInfo.rideID,
        passengers: requestInfo.requesterUsername,
      });
      if (res.length != 0) {
        return resolve(true);
      } else {
        return resolve(false);
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
      const request_upd = await Request.findByIdAndUpdate(
        filter,
        update,
        options
      );
      if (request_upd == null) {
        return reject(Error(404));
      }
      return resolve(request_upd);
    } catch (err) {
      return reject(Error(500));
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
      const request_upd = await Request.findByIdAndUpdate(
        filter,
        update,
        options
      );
      if (request_upd == null) {
        return reject(Error(404));
      }
      return resolve(request_upd);
    } catch (err) {
      return reject(Error(500));
    }
  });
};

// decrementRemindCount decrements the reminders count by one
const decrementRemindCount = (requestID, authUsername) => {
  const filter = { _id: requestID };
  const update = { $inc: { reminders: -1 } };
  const options = { new: true };
  let errFlag = 0;

  return new Promise(async (resolve, reject) => {
    try {
      const request_res = await Request.findById(filter);
      if (request_res == null) {
        errFlag = 404;
        throw null;
      }
      if (request_res.requesteeUsername != authUsername) {
        errFlag = 401;
        throw "Unauthorized request action: You are not the requestee";
      } else if (request_res.reminders < 1) {
        errFlag = 400;
        throw "Reminder count is already less than 1";
      }
      const request_upd = await Request.findOneAndUpdate(
        filter,
        update,
        options
      );
      return resolve(request_upd);
    } catch (err) {
      if (errFlag) {
        return reject(Error(errFlag, err));
      }
      return reject(Error(500));
    }
  });
};

module.exports = {
  getRequestInfo,
  getRequesteeRequests,
  getRequesterRequests,
  createRequest,
  updateRequestStatus,
  archiveRequest,
  unarchiveRequest,
  decrementRemindCount,
};
