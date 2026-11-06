const registerChatSocket = (io) => {
  io.on("connection", (socket) => {
    // Send a chat message
    socket.on("chat-message", ({ meetingId, message }, callback) => {
      try {
        // Validate the meeting ID
        if (
          !meetingId ||
          socket.data.meetingId !== meetingId ||
          !socket.rooms.has(`meeting:${meetingId}`)
        ) {
          return callback?.({
            success: false,
            message: "You are not a participant in this meeting.",
          });
        }

        // Validate the message
        if (typeof message !== "string" || !message.trim()) {
          return callback?.({
            success: false,
            message: "Message cannot be empty.",
          });
        }

        const chatMessage = {
          meetingId,
          senderId: socket.data.userId,
          senderName: socket.data.userName,
          message: message.trim(),
          timestamp: new Date().toISOString(),
        };

        // Send the message to everyone in this meeting
        io.to(`meeting:${meetingId}`).emit(
          "chat-message",
          chatMessage
        );

        callback?.({ success: true });
      } catch (error) {
        console.error("Chat message error:", error);

        callback?.({
          success: false,
          message: "Failed to send message.",
        });
      }
    });
  });
};

module.exports = registerChatSocket;