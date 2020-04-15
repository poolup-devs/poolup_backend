const express = require("express");
const router = new express.Router();

const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");

// Get request information
router.get("/request/info", checkAuth, async (req, res) => {
  const requestID = req.query.requestID;
  try {
    const data = await db.getRequestInfo(requestID);
    res.status(200).json({requests: data});
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }

  // db.getRequestInfo(requestID, (err, data) => {
  //   if (err) {
  //     res.status(500).json({ errorMsg: err });
  //   } else {
  //     res.status(200).json({ requests: data });
  //   }
  // });
});

// Get a requester's requests
router.get("/request/requester", checkAuth, async (req, res) => {
  const requesterUsername = req.query.requesterUsername;
  const status = req.query.status;

  try {
    const data = await db.getRequesterRequests(requesterUsername, status);
    res.status(200).json({ requests: data });
  } catch (err) {
    res.status(500).json({ errorMsg: err });
  }
});

// Get a Requestee's requests
router.get("/request/requestee", checkAuth, async (req, res) => {
  const requesteeUsername = req.query.requesteeUsername;
  const status = req.query.status;

  try {
    const data = await db.getRequesteeRequests(requesteeUsername, status);
    res.status(200).json({ requests: data });
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }
});

// Create a new request
router.post("/request/new", checkAuth, async (req, res) => {
  try {
    const data = await db.createRequest(req.body);
    res.status(200).json({requestID: data._id})
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }
});

// Approve a request
router.put("/request/approve", checkAuth, async (req, res) => {
  const requestID = req.body.params.requestID;
  const authUsername = tokenParser(req.headers.authorization).username;

  try {
    await db.updateRequestStatus(requestID, authUsername, "approved");
    res.sendStatus(200);
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }
});

// Cancel a specified request
router.put("/request/cancel", checkAuth, async (req, res) => {
  const requestID = req.body.params.requestID;
  const authUsername = tokenParser(req.headers.authorization).username;

  try {
    await db.updateRequestStatus(requestID, authUsername, "cancelled");
    res.sendStatus(200);
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }
});

// Deny a specified request
router.put("/request/deny", checkAuth, async (req, res) => {
  const requestID = req.body.params.requestID;
  const authUsername = tokenParser(req.headers.authorization).username;

  try {
    await db.updateRequestStatus(requestID, authUsername, "denied");
    res.sendStatus(200);
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }
});

// Archive a specified request
router.put("/request/archive", checkAuth, async (req, res) => {
  const requestID = req.body.params.requestID;

  try {
    await db.archiveRequest(requestID);
    res.sendStatus(200);
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }
});

// Unarchive a specified request
router.put("/request/unarchive", checkAuth, async (req, res) => {
  const requestID = req.body.params.requestID;

  try {
    await db.unarchiveRequest(requestID);
    res.sendStatus(200);
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }
});

// Delete a specified request
// router.delete("/request/delete", checkAuth, async (req, res) => {
//   const requestID = req.body.requestID;

//   try {
//     const data = await db.deleteRequest(requestID);
//     if(data.deletedCount == 0) {
//       res.status(404).json({ errorMsg: "Request with id: " + requestID + " not found." });
//     } else {
//       res.sendStatus(200);
//     }
//   } catch(err) {
//     res.status(500).json({ errorMsg: err });
//   }
// });

// Remind a Receiver
router.get("/request/remind", checkAuth, async (req, res) => {
  const requestID = req.query.requestID;
  const authUsername = tokenParser(req.headers.authorization).username;

  try {
    await db.decrementRemindCount(requestID, authUsername);
    res.sendStatus(200);
  } catch(err) {
    res.status(500).json({ errorMsg: err });
  }

  // // reduce reminders value by 1
  // db.decrementRemindCount(requestID, (err, data) => {
  //   if (err) {
  //     res.status(500).json({ errorMsg: err });
  //   }
  //   console.log(data);
  //   res.sendStatus(200);
  // });
});

module.exports = router;
