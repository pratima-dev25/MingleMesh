import api from "./api";

// Create a new meeting
export const createMeeting = async (title) => {
  const response = await api.post("/api/meetings/create", {
    title,
  });

  return response.data;
};

// Join an existing meeting
export const joinMeeting = async (meetingId) => {
  const response = await api.post("/api/meetings/join", {
    meetingId,
  });

  return response.data;
};