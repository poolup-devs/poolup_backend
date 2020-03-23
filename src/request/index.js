const express = require("express");
const router = new express.Router();

const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

// Get request information
router.get("/request/info", (req, res) => {
  var requestID = req.query.requestID;

  db.getRequestInfo(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.status(200).json({ requests: data });
    }
  });
});

// Get a sender's requests
router.get("/request/sender", (req, res) => {
  const senderID = req.query.senderID;
  const status = req.query.status;

  db.getSenderRequests(senderID, status, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.status(200).json({ requests: data });
    }
  });
});

// Get a Recipient's requests
router.get("/request/recipient", (req, res) => {
  const recipientID = req.query.recipientID;
  const status = req.query.status;

  db.getRecipientRequests(recipientID, status, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    } else {
      res.status(200).json({ requests: data });
    }
  });
});

// Create a new request
router.post("/request/new", (req, res) => {
  db.createRequest(req.body.requestInfo, (err, data) => {
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

// Unarchive a specified request
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
router.get("/request/remind", (req, res) => {
  const requestID = req.query.requestID;

  // TODO: send notification

  // reduce reminders value by 1
  db.decrementRemindCount(requestID, (err, data) => {
    if (err) {
      res.status(500).json({ errorMsg: err });
    }
    console.log(data);
    res.sendStatus(200);
  });
});

module.exports = router;
