const express = require("express");
const jwt = require("jsonwebtoken");
const router = new express.Router();

const db = require("./controller.js");
const generateRoomKey = require("./utils/roomKey_generator.js").generateRoomKey;
const tokenParser = require("../utils/token-parser.js");
const checkAuth = require("../middleware/jwt_authenticator.js");

const JWT_MESSAGEROOM_KEY = process.env.JWT_MESSAGEROOM_KEY;
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

router.get("/messages/roomKey", checkAuth, (req, res) => {
    const authUsername = tokenParser(req.headers.authorization).username;
    const roomKey = generateRoomKey(authUsername, req.query.usernameOpp );

    res.status(200).send({
        roomKey: roomKey
    })
})

// Fix this so that it would just accept the roomKey stored in the browser
router.get("/messages/history", checkAuth, (req, res) => {
    // use the authToken to extract current user's username
    // const token = req.headers.authorization.split(" ")[1];
    // const ridername = jwt.verify(token, JWT_SECRET_KEY);
    // const roomKey = jwt.sign({rider: ridername, drivername: req.query.drivername}, JWT_MESSAGEROOM_KEY);

    // Prototype: User A, and User B, in order
    const roomKey = generateRoomKey(req.query.userA, req.query.userB);

    db.getMessagesInRoom(roomKey, (err, data) => {
        if(err) {
            res.status(500).send(err);
        } else {
            res.status(200).send(data);
        }
    }) 

})


module.exports = router;