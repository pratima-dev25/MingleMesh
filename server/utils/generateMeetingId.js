const crypto = require("crypto");

const generateMeetingId = () => {
  return crypto.randomBytes(6).toString("hex");
};

module.exports = generateMeetingId;