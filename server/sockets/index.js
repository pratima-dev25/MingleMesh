const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const registerMeetingSocket = require("./meetingSocket");
const registerChatSocket = require("./chatSocket");

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
    },
  });

  // Authenticate every socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.data.userId = user._id.toString();
      socket.data.userName = user.name;

      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  registerMeetingSocket(io);
  registerChatSocket(io);

  return io;
};

module.exports = initializeSocket;