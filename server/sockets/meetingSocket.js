const Meeting = require("../models/Meeting");

const registerMeetingSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join-meeting", async (data, callback) => {
      try {
        const meetingId = data?.meetingId?.trim();

        if (!meetingId) {
          return callback?.({
            success: false,
            message: "Meeting ID is required",
          });
        }

        // Find an active meeting
        const meeting = await Meeting.findOne({
          meetingId,
          status: "active",
        });

        if (!meeting) {
          return callback?.({
            success: false,
            message: "Meeting not found or has ended",
          });
        }

        const userId = socket.data.userId;

        // User must have joined through the Join Meeting API
        const isParticipant = meeting.participants.some(
          (participantId) =>
            participantId.toString() === userId
        );

        if (!isParticipant) {
          return callback?.({
            success: false,
            message: "You are not a participant of this meeting",
          });
        }

        // Prevent this socket from joining another room
        if (socket.data.meetingId) {
          return callback?.({
            success: false,
            message: "You are already in a meeting",
          });
        }

        const room = `meeting:${meetingId}`;

        // Get users already present in the room
        const existingSockets = await io
          .in(room)
          .fetchSockets();

        const existingParticipants = existingSockets.map(
          (participantSocket) => ({
            socketId: participantSocket.id,
            userId: participantSocket.data.userId,
            name: participantSocket.data.userName,
          })
        );

        await socket.join(room);

        socket.data.meetingId = meetingId;

        // Tell the joining user who is already in the room
        callback?.({
          success: true,
          meeting: {
            meetingId: meeting.meetingId,
            title: meeting.title,
          },
          participants: existingParticipants,
        });

        // Notify other users
        socket.to(room).emit("user-joined", {
          socketId: socket.id,
          userId,
          name: socket.data.userName,
        });

        console.log(
          `${socket.data.userName} joined ${meetingId}`
        );
      } catch (error) {
        console.error("Join socket room error:", error.message);

        callback?.({
          success: false,
          message: "Unable to join meeting room",
        });
      }
    });

    socket.on("camera-status", ({ enabled }) => {
    const meetingId = socket.data.meetingId;

    if (!meetingId) return;

    socket.to(`meeting:${meetingId}`).emit("camera-status", {
        socketId: socket.id,
        enabled: Boolean(enabled),
    });
    });

    socket.on("disconnect", () => {
      const meetingId = socket.data.meetingId;

      if (meetingId) {
        socket.to(`meeting:${meetingId}`).emit("user-left", {
          socketId: socket.id,
          userId: socket.data.userId,
        });
      }

      console.log("Socket disconnected:", socket.id);
    });

    // Sending WebRTC offer after receiving to another user
    socket.on("webrtc-offer", ({ to, offer }) => {
        const targetSocket = io.sockets.sockets.get(to);

        // checking that the target is within the same meeting
        if (
            !targetSocket ||
            !socket.data.meetingId ||
            targetSocket.data.meetingId !== socket.data.meetingId
        ) {
            return;
        }

        targetSocket.emit("webrtc-offer", {
            from: socket.id,
            offer,
        });
    });

    // Sending WebRTC answer to another user
    socket.on("webrtc-answer", ({ to, answer }) => {
        const targetSocket = io.sockets.sockets.get(to);

        if (
            !targetSocket ||
            !socket.data.meetingId ||
            targetSocket.data.meetingId !== socket.data.meetingId
        ) {
            return;
        }

        targetSocket.emit("webrtc-answer", {
            from: socket.id,
            answer,
        });
    });

    // ICE candidate doosre user ko bhejna
    socket.on("webrtc-ice-candidate", ({ to, candidate }) => {
        const targetSocket = io.sockets.sockets.get(to);

        if (
            !targetSocket ||
            !socket.data.meetingId ||
            targetSocket.data.meetingId !== socket.data.meetingId
        ) {
            return;
        }

        targetSocket.emit("webrtc-ice-candidate", {
            from: socket.id,
            candidate,
        });
    });
  });
};

module.exports = registerMeetingSocket;