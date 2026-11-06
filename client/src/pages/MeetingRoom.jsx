import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import { createSocket } from "../services/socket";
import VideoPlayer from "../components/VideoPlayer";
import ChatPanel from "../components/ChatPanel";
import MeetingControls from "../components/MeetingControls";

function MeetingRoom() {
  const { meetingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Camera state
  const [localStream, setLocalStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Socket state
  const [status, setStatus] = useState("Connecting...");
  const [participants, setParticipants] = useState([]);
  const [socketError, setSocketError] = useState("");
  const [chatSocket, setChatSocket] = useState(null);

  // WebRTC state
  const [remoteStreams, setRemoteStreams] = useState({});

  const peerConnections = useRef({});
  const pendingCandidates = useRef({});
  const socketRef = useRef(null);

  // 1. Camera and microphone
  useEffect(() => {
    let stream;
    let cancelled = false;

    const startCamera = async () => {
      try {
        setLoadingCamera(true);
        setCameraError("");

        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setLocalStream(stream);
      } catch (error) {
        console.error("Camera error:", error);

        if (!cancelled) {
          setCameraError(
            error.name === "NotAllowedError"
              ? "Camera/microphone permission denied."
              : error.name === "NotFoundError"
              ? "Camera or microphone not found."
              : "Unable to access camera or microphone."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCamera(false);
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. Socket.IO + WebRTC
  useEffect(() => {
   
    if (!localStream) return;

    const socket = createSocket();

    socketRef.current = socket;
    setChatSocket(socket);

    const rtcConfig = {
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    };

    // create Peer connection 
    const createPeerConnection = (remoteSocketId) => {
      if (peerConnections.current[remoteSocketId]) {
        return peerConnections.current[remoteSocketId];
      }

      const peerConnection = new RTCPeerConnection(rtcConfig);

      peerConnections.current[remoteSocketId] = peerConnection;
      pendingCandidates.current[remoteSocketId] = [];

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        const [stream] = event.streams;

        if (stream) {
          setRemoteStreams((current) => ({
            ...current,
            [remoteSocketId]: stream,
          }));
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("webrtc-ice-candidate", {
            to: remoteSocketId,
            candidate: event.candidate,
          });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(
          "Peer connection:",
          remoteSocketId,
          peerConnection.connectionState
        );
      };

      return peerConnection;
    };

    const addPendingCandidates = async (remoteSocketId, pc) => {
      const candidates =
        pendingCandidates.current[remoteSocketId] || [];

      pendingCandidates.current[remoteSocketId] = [];

      for (const candidate of candidates) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (error) {
          console.error("Queued ICE candidate error:", error);
        }
      }
    };

    socket.on("connect", () => {
      setStatus("Connected");

      socket.emit("join-meeting", { meetingId }, async (response) => {
        if (!response?.success) {
          setStatus("Unable to join");
          setSocketError(
            response?.message || "Unable to join meeting"
          );
          return;
        }

        setParticipants(
        (response.participants || []).map((participant) => ({
            ...participant,
            cameraEnabled: true,
        }))
        );
        setStatus("In meeting");

        for (const participant of response.participants || []) {
          try {
            const pc = createPeerConnection(participant.socketId);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.emit("webrtc-offer", {
              to: participant.socketId,
              offer: pc.localDescription,
            });
          } catch (error) {
            console.error("Offer creation error:", error);
          }
        }
      });
    });

    socket.on("connect_error", (error) => {
      setStatus("Connection failed");
      setSocketError(error.message);
    });

    socket.on("user-joined", (participant) => {
      setParticipants((current) => {
        if (
          current.some(
            (item) => item.socketId === participant.socketId
          )
        ) {
          return current;
        }

        return [...current, participant];
      });

    });

    // receive Offer and send answer 
    socket.on("webrtc-offer", async ({ from, offer }) => {
      try {
        const pc = createPeerConnection(from);

        await pc.setRemoteDescription(
          new RTCSessionDescription(offer)
        );

        await addPendingCandidates(from, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", {
          to: from,
          answer: pc.localDescription,
        });
      } catch (error) {
        console.error("Offer handling error:", error);
      }
    });

    // receive Answer
    socket.on("webrtc-answer", async ({ from, answer }) => {
      try {
        const pc = peerConnections.current[from];

        if (!pc) return;

        await pc.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        await addPendingCandidates(from, pc);
      } catch (error) {
        console.error("Answer handling error:", error);
      }
    });

    //receive ICE candidate 
    socket.on(
      "webrtc-ice-candidate",
      async ({ from, candidate }) => {
        try {
          const pc = peerConnections.current[from];

          if (!pc || !pc.remoteDescription) {
            if (!pendingCandidates.current[from]) {
              pendingCandidates.current[from] = [];
            }

            pendingCandidates.current[from].push(candidate);
            return;
          }

          await pc.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error("ICE candidate error:", error);
        }
      }
    );


    socket.on("camera-status", ({ socketId, enabled }) => {
    setParticipants((current) =>
        current.map((participant) =>
        participant.socketId === socketId
            ? {
                ...participant,
                cameraEnabled: enabled,
            }
            : participant
        )
    );
    });

    // Participant leave kare toh connection cleanup
    socket.on("user-left", ({ socketId }) => {
      const pc = peerConnections.current[socketId];

      if (pc) {
        pc.close();
        delete peerConnections.current[socketId];
      }

      delete pendingCandidates.current[socketId];

      setRemoteStreams((current) => {
        const updated = { ...current };
        delete updated[socketId];
        return updated;
      });

      setParticipants((current) =>
        current.filter(
          (participant) => participant.socketId !== socketId
        )
      );
    });

    socket.connect();

    return () => {
      socket.disconnect();

      Object.values(peerConnections.current).forEach((pc) => {
        pc.close();
      });

      peerConnections.current = {};
      pendingCandidates.current = {};
      socketRef.current = null;
      setChatSocket(null);
    };
  }, [meetingId, localStream]);


  const handleToggleMute = () => {
    if (!localStream) return;

    const audioTracks = localStream.getAudioTracks();

    audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
    });

    setIsMuted((current) => !current);
    };


   const handleToggleCamera = () => {
    if (!localStream) return;

    const newCameraEnabled = isCameraOff;

    localStream.getVideoTracks().forEach((track) => {
        track.enabled = newCameraEnabled;
    });

    setIsCameraOff(!newCameraEnabled);

    if (socketRef.current) {
        socketRef.current.emit("camera-status", {
        enabled: newCameraEnabled,
        });
    }
    };

  // 3. Leave meeting
  const handleLeaveMeeting = () => {
    navigate("/dashboard");
  };

 return (
  <div className="meeting-room">

    {/* ================= HEADER ================= */}
    <header className="meeting-header">

      <div className="meeting-brand">
        <div className="meeting-brand-icon">M</div>

        <div>
          <h1>MingleMesh</h1>
          <span>Video Meeting</span>
        </div>
      </div>

      <div className="meeting-info">
        <div className="meeting-id">
          <span>Meeting ID</span>
          <strong>{meetingId}</strong>
        </div>

        <div className="connection-status">
          <span className="status-dot"></span>
          {status}
        </div>
      </div>

    </header>


    {/* ================= ERROR ================= */}
    {socketError && (
      <div className="meeting-error">
        {socketError}
      </div>
    )}


    {/* ================= MAIN CONTENT ================= */}
    <main className="meeting-main">

      {/* VIDEO SECTION */}
      <section className="video-section">

        <div className="video-section-header">
          <div>
            <h2>Meeting</h2>
            <p>
              {participants.length + 1} participant
              {participants.length !== 0 ? "s" : ""}
            </p>
          </div>
        </div>


        {/* Camera Error */}
        {cameraError && (
          <div className="meeting-error">
            {cameraError}
          </div>
        )}


        {/* Video Grid */}
        <div className="video-grid">

          {/* YOUR VIDEO */}
          <div className="video-card local-video-card">

            <div className="video-card-label">
              <span>You</span>
              {isMuted && <span>🎤 Muted</span>}
            </div>

            {loadingCamera ? (
              <div className="video-placeholder">
                <div className="loading-spinner"></div>
                <p>Starting camera...</p>
              </div>
            ) : isCameraOff ? (
              <div className="camera-off">
                <div className="camera-off-avatar">
                  {user?.name
                    ? user.name.charAt(0).toUpperCase()
                    : "U"}
                </div>

                <div className="camera-off-name">
                  {user?.name || "You"}
                </div>

                <div className="camera-off-status">
                  📹 Camera Off
                </div>
              </div>
            ) : localStream ? (
              <VideoPlayer
                stream={localStream}
                muted={true}
              />
            ) : (
              <div className="video-placeholder">
                <p>Camera unavailable</p>
              </div>
            )}

          </div>


          {/* OTHER PARTICIPANTS */}
          {participants.map((participant) => (

            <div
              className="video-card"
              key={participant.socketId}
            >

              <div className="video-card-label">
                <span>
                  {participant.name || "Participant"}
                </span>
              </div>


              {participant.cameraEnabled === false ? (

                <div className="camera-off">

                  <div className="camera-off-avatar">
                    {participant.name
                      ? participant.name
                          .charAt(0)
                          .toUpperCase()
                      : "U"}
                  </div>

                  <div className="camera-off-name">
                    {participant.name || "Participant"}
                  </div>

                  <div className="camera-off-status">
                    📹 Camera Off
                  </div>

                </div>

              ) : remoteStreams[participant.socketId] ? (

                <VideoPlayer
                  stream={remoteStreams[participant.socketId]}
                  muted={false}
                />

              ) : (

                <div className="video-placeholder">
                  <div className="loading-spinner"></div>
                  <p>Connecting video...</p>
                </div>

              )}

            </div>

          ))}


          {/* NO OTHER PARTICIPANTS */}
          {participants.length === 0 && (
            <div className="waiting-card">

              <div className="waiting-icon">
                👥
              </div>

              <h3>Waiting for others</h3>

              <p>
                Share the meeting ID with someone
                to invite them.
              </p>

              <div className="waiting-meeting-id">
                {meetingId}
              </div>

            </div>
          )}

        </div>

      </section>


      {/* ================= CHAT ================= */}
      <aside className="meeting-chat">


        <ChatPanel
          socket={chatSocket}
          meetingId={meetingId}
        />

      </aside>

    </main>


    {/* ================= CONTROLS ================= */}
    <div className="meeting-bottom-bar">

      <MeetingControls
        localStream={localStream}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onLeave={handleLeaveMeeting}
      />

    </div>

  </div>
);
};

export default MeetingRoom;