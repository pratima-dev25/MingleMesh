import { useEffect, useState } from "react";

function ChatPanel({ socket, meetingId }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Receive messages from the server
  useEffect(() => {
    if (!socket) return;

    const handleChatMessage = (newMessage) => {
      if (newMessage.meetingId !== meetingId) return;

      setMessages((current) => [...current, newMessage]);
    };

    socket.on("chat-message", handleChatMessage);

    return () => {
      socket.off("chat-message", handleChatMessage);
    };
  }, [socket, meetingId]);

  // Send a message
  const handleSendMessage = (event) => {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || !socket) return;

    setError("");

    socket.emit(
      "chat-message",
      {
        meetingId,
        message: trimmedMessage,
      },
      (response) => {
        if (!response?.success) {
          setError(response?.message || "Message could not be sent.");
        }
      }
    );

    setMessage("");
  };

  return (
    <div className="chat-panel">
      <h2>Meeting Chat</h2>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <p>No messages yet. Start the conversation!</p>
        ) : (
          messages.map((item, index) => (
            <div
              className="chat-message"
              key={`${item.timestamp}-${item.senderId}-${index}`}
            >
              <strong>{item.senderName}</strong>

              <p>{item.message}</p>

              <small>
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
          ))
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Type a message..."
          aria-label="Chat message"
        />

        <button type="submit" disabled={!message.trim() || !socket}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;