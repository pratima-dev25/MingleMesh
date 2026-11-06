function MeetingControls({
  localStream,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onLeave,
}) {
  return (
    <div className="meeting-controls">

      {/* Microphone */}
      <button
        className={`control-button ${
          isMuted ? "control-active" : ""
        }`}
        onClick={onToggleMute}
        title={isMuted ? "Turn microphone on" : "Mute microphone"}
      >
        <span className="control-icon">
          {isMuted ? "🔇" : "🎤"}
        </span>

        <span className="control-label">
          {isMuted ? "Unmute" : "Mute"}
        </span>
      </button>


      {/* Camera */}
      <button
        className={`control-button ${
          isCameraOff ? "control-active" : ""
        }`}
        onClick={onToggleCamera}
        title={
          isCameraOff
            ? "Turn camera on"
            : "Turn camera off"
        }
      >
        <span className="control-icon">
          {isCameraOff ? "📹" : "📷"}
        </span>

        <span className="control-label">
          {isCameraOff ? "Camera On" : "Camera Off"}
        </span>
      </button>


      {/* Leave */}
      <button
        className="control-button leave-button"
        onClick={onLeave}
        title="Leave meeting"
      >
        <span className="control-icon">
          📞
        </span>

        <span className="control-label">
          Leave
        </span>
      </button>

    </div>
  );
}

export default MeetingControls;