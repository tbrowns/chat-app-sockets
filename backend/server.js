const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const Message = require("./models/message");

require("dotenv").config();

const MONGO_URI = process.env.MONGODB_URI;
console.log(MONGO_URI);

// MongoDB Connection
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Socket.io Connection Handler
io.on("connection", (socket) => {
  console.log("New client connected");

  // Save message to database
  socket.on("send_message", async (messageData) => {
    try {
      // Create new message document
      const newMessage = new Message({
        content: messageData.content,
        sender: messageData.sender,
        roomId: messageData.roomId || "general",
      });

      // Save to database
      await newMessage.save();

      // Broadcast message to all clients
      io.emit("receive_message", newMessage);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  // Fetch previous messages
  socket.on("fetch_messages", async (roomId = "general") => {
    try {
      const messages = await Message.find({ roomId })
        .sort({ timestamp: 1 })
        .limit(50); // Limit to last 50 messages

      socket.emit("previous_messages", messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
