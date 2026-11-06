const express = require("express");

const {
  createMeeting,
  joinMeeting,
} = require("../controllers/meetingController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All meeting routes below require authentication
router.post("/create", authMiddleware, createMeeting);
router.post("/join", authMiddleware, joinMeeting);

module.exports = router;