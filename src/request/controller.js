const Request = require("./request").Request;

// getSenderRequests gets a sender's requests based on status
const getSenderRequests = (senderID, status, callback) => {

    let query = {};

    if(status == "All") {
      query = { senderID: senderID }
    } else if(status == "Visible") {
      query = { $and: [
          {senderID: senderID}, { $or: [{status: "pending"}, {status: "denied"}, {status: "cancelled"}, {status: "approved"}]}
      ]};
    } else {
      query = { senderID: senderID, status: status }
    }

    Request.find(
        query,
        (err, result) => {
            if(err) {
                callback(err, null);
            } else {
                callback(null, result);
            }
        }
    );
}

// getRecepientRequests gets Recepient requests based off status
const getRecepientRequests = (recepientID, status, callback) => {

    let query = {};

    if(status == "All") {
      query = { recepientID: recepientID }
    } else if(status == "Visible") {
      query = { $and: [
          {recepientID: recepientID}, { $or: [{status: "pending"}, {status: "denied"}, {status: "cancelled"}, {status: "approved"}]}
      ]};
    } else {
      query = { recepientID: recepientID, status: status }
    }

    Request.find(
        query,
        (err, result) => {
            if(err) {
                callback(err, null);
            } else {
                callback(null, result);
            }
        }
    );
}

// createRequest creates a new request from the specified user with
// regards about the specified ride
const createRequest = (rideID, senderID, recepientID, msg, callback) => {
    newRequest = {
        rideID: rideID,
        senderID: senderID,
        recepientID: recepientID,
        msg: msg,
        date: new Date()
    }

    Request.create(newRequest, (err, result) => {
        if(err) {
            callback(err, null);
        } else {
            callback(null, result);
        }
    });
}

// approveRequest sets a specified request's status to 'approved'
const approveRequest = (requestID, callback) => {

    Request.findOneAndUpdate(
        { _id: requestID },
        { $push: { status: "approved" } },
        { new: true },
        (err, result) => {
            if(err) {
                callback(err, null);
            } else {
                callback(null, result);
            }
    });
}

// cancelRequest sets a specified request's status to 'cancelled'
const cancelRequest = (requestID, callback) => {

    Request.findOneAndUpdate(
        { _id: requestID },
        { $push: { status: "cancelled" } },
        { new: true },
        (err, result) => {
            if(err) {
                callback(err, null);
            } else {
                callback(null, result);
            }
    });
}

// denyRequest sets a specified request status to 'denied'
const denyRequest = (requestID, callback) => {

    Request.findOneAndUpdate(
        { _id: requestID },
        { $push: { status: "denied" } },
        { new: true },
        (err, result) => {
            if(err) {
                callback(err, null);
            } else {
                callback(null, result);
            }
    });
}

// archiveRequest sets a specified request status to 'archived'
const archiveRequest = (requestID, callback) => {

    Request.findOneAndUpdate(
        { _id: requestID },
        { $push: { status: "archived" } },
        { new: true },
        (err, result) => {
            if(err) {
                callback(err, null);
            } else {
                callback(null, result);
            }
    });
}

// deleteRequest deletes a specified request from the database
const deleteRequest = (requestID, callback) => {

    Request.deleteOne({ requestID }, (err, result) => {
            if(err) {
                callback(err, null);
            } else {
                callback(null, result);
            }
    });
}

module.exports = {
    getRecepientRequests,
    getSenderRequests,
    createRequest,
    approveRequest,
    cancelRequest,
    denyRequest,
    archiveRequest,
    deleteRequest
};