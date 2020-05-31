const Request = require("./request").Request;
const User = require("../user/user").User;
const Noti = require("../noti/noti").Noti;
const Ride = require("../ride/ride").Ride;
const mongoose = require("mongoose");

const ControllerException = require("../utils/errors/controllerException");

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
        return reject(new ControllerException(404, "ride of ride_id not found"));
      }
      return resolve(res);
    } catch (err) {
      return reject(err);
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
        return reject(new ControllerException(404, "username not found"));
      }

      const res = await Request.find(query);
      return resolve(res);
    } catch (err) {
      return reject(err);
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
        return reject(new ControllerException(404, "username not found"));
      }

      const res = await Request.find(query);
      return resolve(res);
    } catch (err) {
      return reject(err);
    }
  });
};

// createRequest creates a new request from the specified user with
// regards about the specified ride
const createRequest = async (requestInfo) => {
  //Check to see if a request has already been sent by this user and ride
  return new Promise(async (resolve, reject) => {
    try {
      if (await doesRequestExist(requestInfo)) {
        return reject(
          new ControllerException(400, "A request has already been created for this ride")
        );
      } else if (await isAlreadyInRide(requestInfo)) {
        return reject(new ControllerException(400, "The user is already in this ride"));
      }
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
    };

    try {
      const ride = await Ride.findById(newRequest.rideID);
      const requester = await User.findOne({
        username: newRequest.requesterUsername,
      }).lean();
      const requestee = await User.findOne({
        username: newRequest.requesteeUsername,
      }).lean();

      if (ride == null) {
        reject(new ControllerException(404, "ride with rideID not found"));
      }
      if (!requester) {
        reject(new ControllerException(404, "specified requesterUsername not found"));
      }
      if (!requestee) {
        reject(new ControllerException(404, "specified requesteeUsername not found"));
      }

      const request = await Request.create(newRequest);
      await Noti.create({
        username: request.requesteeUsername,
        iconUrl: requester.picUrl,
        msg: `${requester.firstName} is requesting a spot on your trip from ${ride.from} to ${ride.to}`,
        redirectPath: MY_DRIVES_PATH,
      });
      return resolve(request);
    } catch (err) {
      return reject(err);
    }
  });
};

// update status of request to either "approved", "denied", or "cancelled"
const updateRequestStatus = async (requestID, authUsername, status) => {
  const filter = { _id: requestID };
  const update = { $set: { status: status } };
  const options = { new: true };

  return new Promise(async (resolve, reject) => {
    try {
      let request_res = await Request.findOne(filter);
      if (!request_res) {
        return reject(new ControllerException(404, "Specified request not found"));
      } else if (request_res.archived) {
        return reject(new ControllerException(400, "Ride has already been archived"));
      } else if (request_res.status !== "pending") {
        return reject(new ControllerException(400, "Ride has already been " + request_res.status));
      } else {
        switch (status) {
          case "approved": {
            if (authUsername != request_res.requesteeUsername) {
              return reject(
                new ControllerException(
                  403,
                  "Unauthorized request action: You are not the requestee"
                )
              );
            }
            request_upd = await Request.findOneAndUpdate(filter, update, options);
            const requestee = await User.findOne({
              username: request_upd.requesteeUsername,
            }).lean();
            await Ride.findByIdAndUpdate(
              { _id: request_upd.rideID },
              { $addToSet: { passengers: request_upd.requesterUsername } },
              { new: true }
            );
            await Noti.create({
              username: request_upd.requesterUsername,
              msg: `${requestee.firstName} has accepted your ride request`,
              iconUrl: requestee.picUrl,
              redirectPath: MY_RIDES_PATH,
            });
            break;
          }
          case "denied": {
            if (authUsername != request_res.requesteeUsername) {
              return reject(
                new ControllerException(
                  403,
                  "Unauthorized request action: You are not the requestee"
                )
              );
            }
            request_upd = await Request.findOneAndUpdate(filter, update, options);
            const requestee = await User.findOne({
              username: request_upd.requesteeUsername,
            }).lean();
            await Noti.create({
              username: request_upd.requesterUsername,
              msg: `Your request to join ${requestee.firstName}'s ride has been denied`,
              iconUrl: requestee.picUrl,
              redirectPath: MY_RIDES_PATH,
            });
            break;
          }
          case "cancelled": {
            if (authUsername != request_res.requesterUsername) {
              return reject(
                new ControllerException(
                  401,
                  "Unauthorized request action: You are not the requester"
                )
              );
            }
            request_upd = await Request.findOneAndUpdate(filter, update, options);
            const requester = await User.findOne({
              username: request_upd.requesterUsername,
            }).lean();
            await Noti.create({
              username: request_upd.requesteeUsername,
              msg: `${requester.firstName}'s request for your ride has been withdrawn`,
              iconUrl: requester.picUrl,
              redirectPath: MY_DRIVES_PATH,
            });
            break;
          }
          case "paid": {
            if (authUsername != request_res.requesterUsername) {
              return reject(
                new ControllerException(
                  401,
                  "Unauthorized request action: You are not the requester"
                )
              );
            }
            request_upd = await Request.findOneAndUpdate(filter, update, options);
            const requester = await User.findOne({
              username: request_upd.requesterUsername,
            }).lean();
            await Noti.create({
              username: request_upd.requesteeUsername,
              msg: `${requester.firstName}'s request for your ride has been paid`,
              iconUrl: requester.picUrl,
              redirectPath: MY_DRIVES_PATH,
            });
            break;
          }
          default: {
            return reject(new ControllerException(400, "invalid status to update"));
          }
        }
        return resolve(request_upd);
      }
    } catch (err) {
      return reject(err);
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
      const request_upd = await Request.findByIdAndUpdate(filter, update, options);
      if (request_upd == null) {
        return reject(new ControllerException(404, "request object not found"));
      }
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
      const request_upd = await Request.findByIdAndUpdate(filter, update, options);
      if (request_upd == null) {
        return reject(new ControllerException(404, "request object not found"));
      }
      return resolve(request_upd);
    } catch (err) {
      return reject(err);
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
        return reject(new ControllerException(404, "request object not found"));
      }
      if (request_res.requesteeUsername != authUsername) {
        return reject(
          new ControllerException(403, "Unauthorized request action: You are not the requestee")
        );
      } else if (request_res.reminders < 1) {
        return reject(new ControllerException(400, "Reminder count is already less than 1"));
      }
      const request_upd = await Request.findOneAndUpdate(filter, update, options);
      return resolve(request_upd);
    } catch (err) {
      return reject(err);
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
