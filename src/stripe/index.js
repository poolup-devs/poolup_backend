const express = require("express");
const router = new express.Router();

const checkAuth = require("../middleware/jwt_authenticator.js");

// Send back Stripe Public Key
router.get("/stripe/public-key", checkAuth, (req, res) => {
    res.send({ publicKey: process.env.STRIPE_API_KEY });
});
  
module.exports = router;