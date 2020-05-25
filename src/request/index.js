const express = require("express");
const router = new express.Router();

const db = require("./controller.js");
const checkAuth = require("../middleware/jwt_authenticator.js");
const tokenParser = require("../utils/token-parser.js");
const errResp = require("../utils/errors/errResponse");

// Get request information
router.get("/request/info", checkAuth, async (req, res) => {
  const requestID = req.query.requestID;
  try {
    const data = await db.getRequestInfo(requestID);
    res.status(200).json({ requests: data });
  } catch (err) {
    errResp(res, err);
  }
});

// Get a requester's requests
router.get("/request/requester", checkAuth, async (req, res) => {
  const requesterUsername = req.query.requesterUsername;
  const status = req.query.status;

  try {
    const data = await db.getRequesterRequests(requesterUsername, status);
    res.status(200).json({ requests: data });
  } catch (err) {
    errResp(res, err);
  }
});

// Get a Requestee's requests
router.get("/request/requestee", checkAuth, async (req, res) => {
  const requesteeUsername = req.query.requesteeUsername;
  const status = req.query.status;

  try {
    const data = await db.getRequesteeRequests(requesteeUsername, status);
    res.status(200).json({ requests: data });
  } catch (err) {
    errResp(res, err);
  }
});

// Create a new request
router.post("/request/new", checkAuth, async (req, res) => {
  try {
    const data = await db.createRequest(req.body);
    res.status(201).json({ requestID: data._id });
  } catch (err) {
    errResp(res, err);
  }
});

// Approve a request
router.put("/request/approve", checkAuth, async (req, res) => {
  const requestID = req.body.requestID;
  const authUsername = await tokenParser(req.headers.authorization);

  try {
    await db.updateRequestStatus(requestID, authUsername, "approved");
    res.sendStatus(200);
  } catch (err) {
    errResp(res, err);
  }
});

// Cancel a specified request
router.put("/request/cancel", checkAuth, async (req, res) => {
  console.log(req.body);
  const requestID = req.body.requestID;
  const authUsername = await tokenParser(req.headers.authorization);

  try {
    await db.updateRequestStatus(requestID, authUsername, "cancelled");
    res.sendStatus(200);
  } catch (err) {
    errResp(res, err);
  }
});

// Deny a specified request
router.put("/request/deny", checkAuth, async (req, res) => {
  console.log(req.body);
  const requestID = req.body.requestID;
  const msg = req.body.msg;
  const authUsername = await tokenParser(req.headers.authorization);

  try {
    await db.updateRequestStatus(requestID, authUsername, "denied");
    res.sendStatus(200);
  } catch (err) {
    errResp(res, err);
  }
});

// Archive a specified request
router.put("/request/archive", checkAuth, async (req, res) => {
  const requestID = req.body.requestID;

  try {
    await db.archiveRequest(requestID);
    res.sendStatus(200);
  } catch (err) {
    errResp(res, err);
  }
});

// Unarchive a specified request
router.put("/request/unarchive", checkAuth, async (req, res) => {
  const requestID = req.body.params.requestID;

  try {
    await db.unarchiveRequest(requestID);
    res.sendStatus(200);
  } catch (err) {
    errResp(res, err);
  }
});

// Remind a Receiver
router.get("/request/remind", checkAuth, async (req, res) => {
  const requestID = req.query.requestID;
  const authUsername = await tokenParser(req.headers.authorization);

  try {
    await db.decrementRemindCount(requestID, authUsername);
    res.sendStatus(200);
  } catch (err) {
    errResp(res, err);
  }
});

module.exports = router;
