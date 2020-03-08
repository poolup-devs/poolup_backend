const express = require("express");
const router = new express.Router();

const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

// Get a sender's requests
router.get("/request/sender", (req, res) => {
  console.log(req.headers);
  var senderID = tokenParser(req.headers.authorization).username; //my username
  const status = req.query.status;

  db.getSenderRequests(senderID, status, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.status(200).json({ requests: data });
    }
  });
});

// Get a recepient's requests
router.get("/request/recepient", (req, res) => {
  var recepientID = ""; //tokenParser(req.headers.authorization).username;
  if (req.query.recepientID != "") {
    recepientID = req.query.recepientID;
  }
  const status = req.query.status;

  db.getRecepientRequests(recepientID, status, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.status(200).json({ requests: data });
    }
  });
});

// Create a new request
router.post("/request/new", checkAuth, (req, res) => {
  const senderID = req.body.senderID; //my username
  const rideID = req.body.rideID;
  const recepientID = req.body.recepientID;
  const luggage = req.body.luggage;
  const msg = req.body.msg;
  db.createRequest(rideID, senderID, recepientID, luggage, msg, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.status(200).json({ requestID: data._id });
      //TODO: Send new request notification
    }
  });
});

// Approve a request
router.put("/request/approve", (req, res) => {
  const requestID = req.body.params.requestID;
  db.approveRequest(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.sendStatus(200);
      //TODO: Send approved notification
    }
  });
});

// Cancel a specified request
router.put("/request/cancel", (req, res) => {
  const requestID = req.body.params.requestID;
  db.cancelRequest(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.sendStatus(200);
      //TODO: Send cancelled notification
    }
  });
});

// Deny a specified request
router.put("/request/deny", (req, res) => {
  console.log(req.body);
  const requestID = req.body.params.requestID;
  const msg = req.body.msg;
  db.denyRequest(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.sendStatus(200);
      //TODO: Send denied notification including msg from driver
    }
  });
});

// Archive a specified request
router.put("/request/archive", (req, res) => {
  const requestID = req.body.params.requestID;
  db.archiveRequest(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.sendStatus(200);
      //TODO: Send archived notification
    }
  });
});

// Archive a specified request
router.put("/request/unarchive", (req, res) => {
  const requestID = req.body.params.requestID;
  db.unarchiveRequest(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.sendStatus(200);
      //TODO: Send unarchived notification
    }
  });
});

// Delete a specified request
router.delete("/request/delete", (req, res) => {
  const requestID = req.body.requestID;

  db.deleteRequest(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      if (data.deletedCount == 0) {
        res
          .status(404)
          .json({ errorMsg: "Request with id: " + requestID + " not found." });
      } else {
        res.sendStatus(200);
        //TODO: Send deleted notification
      }
    }
  });
});

// Remind a Receiver
router.delete("/request/remind", (req, res) => {
  const requestID = req.body.requestID;

  // Grab request details

  // send notification

  // reduce request value by 1

  res.sendStatus(200);
});

module.exports = router;
