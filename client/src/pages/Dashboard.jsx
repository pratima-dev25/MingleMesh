import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  createMeeting,
  joinMeeting,
} from "../services/meetingService";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [meetingId, setMeetingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create a new meeting
  const handleCreateMeeting = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await createMeeting("My Meeting");
      const newMeetingId = data.meeting.meetingId;

      navigate(`/meeting/${newMeetingId}`);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to create meeting"
      );
    } finally {
      setLoading(false);
    }
  };

  // Join an existing meeting
  const handleJoinMeeting = async (e) => {
    e.preventDefault();

    if (!meetingId.trim()) {
      setError("Please enter a meeting ID");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await joinMeeting(meetingId.trim());

      navigate(`/meeting/${data.meeting.meetingId}`);
    } catch (error) {
      setError(
        error.response?.data?.message ||
          "Unable to join meeting"
      );
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="dashboard">

      {/* Navbar */}
      <header className="dashboard-navbar">
        <div className="brand">
          <span className="brand-icon">M</span>
          <h1>MingleMesh</h1>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">

        {/* Welcome Section */}
        <section className="welcome-section">
          <p className="welcome-label">DASHBOARD</p>

          <h2>
            Welcome, {user?.name}! 👋
          </h2>

          <p>
            Start a new meeting or join an existing one.
          </p>
        </section>

        {/* Error */}
        {error && (
          <div className="dashboard-error">
            {error}
          </div>
        )}

        {/* Meeting Cards */}
        <section className="meeting-options">

          {/* Create Meeting */}
          <div className="meeting-card create-card">
            <div className="card-icon">
              +
            </div>

            <div className="card-content">
              <h3>Create a Meeting</h3>

              <p>
                Start a new video meeting and invite
                others to join.
              </p>

              <button
                className="primary-button"
                onClick={handleCreateMeeting}
                disabled={loading}
              >
                {loading
                  ? "Creating..."
                  : "Create Meeting"}
              </button>
            </div>
          </div>

          {/* Join Meeting */}
          <div className="meeting-card join-card">
            <div className="card-icon">
              ↗
            </div>

            <div className="card-content">
              <h3>Join a Meeting</h3>

              <p>
                Enter a meeting ID to join an
                existing meeting.
              </p>

              <form onSubmit={handleJoinMeeting}>
                <input
                  className="meeting-input"
                  type="text"
                  placeholder="Enter meeting ID"
                  value={meetingId}
                  onChange={(e) =>
                    setMeetingId(e.target.value)
                  }
                />

                <button
                  className="secondary-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading
                    ? "Joining..."
                    : "Join Meeting"}
                </button>
              </form>
            </div>
          </div>

        </section>

        {/* Bottom Info */}
        <div className="dashboard-info">
          <span>🔒</span>
          <p>
            Your meetings are private and secure.
          </p>
        </div>

      </main>
    </div>
  );
}

export default Dashboard;