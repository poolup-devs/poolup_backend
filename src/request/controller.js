const Request = require("./request").Request;
const mongoose = require("mongoose");

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
      $and: [{ senderID: senderID }, { archived: false }]
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
      $and: [{ recipientID: recipientID }, { archived: false }]
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

// createRequest creates a new request from the specified user with
// regards about the specified ride
const createRequest = (requestInfo, callback) => {
  newRequest = {
    rideID: requestInfo.rideID,
    senderID: requestInfo.senderID,
    recipientID: requestInfo.recipientID,
    carryOn: requestInfo.carryOn,
    luggage: requestInfo.luggage,
    msg: requestInfo.msg,
    date: new Date()
  };

  Request.create(newRequest, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
};

// approveRequest sets a specified request's status to 'approved'
const approveRequest = (requestID, callback) => {
  const filter = { _id: requestID };
  const update = { $set: { status: "approved" } };
  const options = { new: true };

  Request.findOne(filter, (findErr, findResult) => {
    if (findErr) {
      callback(findErr, null);
    } else {
      if (findResult.archived) {
        callback("Ride has already been archived");
      } else if (findResult.status !== "pending") {
        callback("Ride has already been " + findResult.status, null);
      } else {
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
      }
    }
  });
};

// cancelRequest sets a specified request's status to 'cancelled'
const cancelRequest = (requestID, callback) => {
  const filter = { _id: requestID };
  const update = { $set: { status: "cancelled" } };
  const options = { new: true };

  Request.findOne(filter, (findErr, findResult) => {
    if (findErr) {
      callback(findErr, null);
    } else {
      if (findResult.archived) {
        callback("Ride has already been archived");
      } else if (findResult.status !== "pending") {
        callback("Ride has already been " + findResult.status, null);
      } else {
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
      }
    }
  });
};

// denyRequest sets a specified request status to 'denied'
const denyRequest = (requestID, callback) => {
  const filter = { _id: requestID };
  const update = { $set: { status: "denied" } };
  const options = { new: true };

  Request.findOne(filter, (findErr, findResult) => {
    if (findErr) {
      callback(findErr, null);
    } else {
      if (findResult.archived) {
        callback("Ride has already been archived");
      } else if (findResult.status !== "pending") {
        callback("Ride has already been " + findResult.status, null);
      } else {
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
      }
    }
  });
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
  Request.deleteOne({ requestID }, (err, result) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, result);
    }
  });
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
  deleteRequest
};
