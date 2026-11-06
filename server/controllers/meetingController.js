const Meeting = require("../models/Meeting");
const generateMeetingId = require("../utils/generateMeetingId");

// Create a new meeting
const createMeeting = async (req, res) => {
  try {
    const { title } = req.body;

    const meetingId = generateMeetingId();

    const meeting = await Meeting.create({
      meetingId,
      title: title?.trim() || "MingleMesh Meeting",
      host: req.user._id,
      participants: [req.user._id],
    });

    return res.status(201).json({
      message: "Meeting created successfully",
      meeting: {
        _id: meeting._id,
        meetingId: meeting.meetingId,
        title: meeting.title,
        host: meeting.host,
        participants: meeting.participants,
        status: meeting.status,
        createdAt: meeting.createdAt,
      },
    });
  } catch (error) {
    console.error("Create meeting error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Meeting ID conflict. Please try again.",
      });
    }

    return res.status(500).json({
      message: "Failed to create meeting",
    });
  }
};




// Join an existing meeting
const joinMeeting = async (req, res) => {
  try {
    const { meetingId } = req.body;

    if (!meetingId || typeof meetingId !== "string") {
      return res.status(400).json({
        message: "Meeting ID is required",
      });
    }

    const meeting = await Meeting.findOne({
      meetingId: meetingId.trim(),
    });

    if (!meeting) {
      return res.status(404).json({
        message: "Meeting not found",
      });
    }

    if (meeting.status !== "active") {
      return res.status(400).json({
        message: "This meeting has already ended",
      });
    }

    // Add the user only if they are not already a participant
    const updatedMeeting = await Meeting.findOneAndUpdate(
      {
        _id: meeting._id,
        status: "active",
      },
      {
        $addToSet: {
          participants: req.user._id,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedMeeting) {
      return res.status(400).json({
        message: "This meeting is no longer active",
      });
    }

    return res.status(200).json({
      message: "Joined meeting successfully",
      meeting: {
        _id: updatedMeeting._id,
        meetingId: updatedMeeting.meetingId,
        title: updatedMeeting.title,
        host: updatedMeeting.host,
        participants: updatedMeeting.participants,
        status: updatedMeeting.status,
      },
    });
  } catch (error) {
    console.error("Join meeting error:", error.message);

    return res.status(500).json({
      message: "Failed to join meeting",
    });
  }
};

module.exports = {
  createMeeting,
  joinMeeting,
};