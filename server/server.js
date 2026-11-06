const express = require("express");
const http = require("http");
require("dotenv").config();
const initializeSocket = require("./sockets");
const connectDB = require("./config/db");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");

const app = express();
const httpServer = http.createServer(app);

app.use(express.urlencoded({extended: true}));

app.use(cors({
  origin: process.env.CLIENT_URL
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/meetings", meetingRoutes);

app.get("/", (req, res) => {
  res.send("MingleMesh API is running!");
});

const io = initializeSocket(httpServer);


io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();