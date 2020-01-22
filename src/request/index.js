const express = require("express");
const router = new express.Router();

const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

// Get a sender's requests
router.get("/request/sender", checkAuth, (req, res) => {
  const senderID = tokenParser(req.headers.authorization).username; //my username
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
router.get("/request/recepient", checkAuth, (req, res) => {
  const recepientID = req.query.recepientID;
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
  const senderID = tokenParser(req.headers.authorization).username; //my username
  const rideID = req.body.rideID;
  const recepientID = req.body.recepientID;
  const msg = req.body.msg;
  db.createRequest(rideID, senderID, recepientID, msg, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.status(200).json({ requestID: data._id });
      //TODO: Send new request notification
    }
  });
});

// Approve a request
router.put("/request/approve", checkAuth, (req, res) => {
  const requestID = req.query.requestID;
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
router.put("/request/cancel", checkAuth, (req, res) => {
  const requestID = req.query.requestID;
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
router.put("/request/deny", checkAuth, (req, res) => {
  const requestID = req.query.requestID;
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
router.put("/request/archive", checkAuth, (req, res) => {
  const requestID = req.query.requestID;
  db.archiveRequest(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.sendStatus(200);
      //TODO: Send archived notification
    }
  });
});

// Delete a specified request
router.delete("/request/delete", checkAuth, (req, res) => {
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

module.exports = router;
