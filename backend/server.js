import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoute from './routes/authRoute.js';
import PollRoute from './routes/pollRoute.js';
import Poll from './models/pollSchema.js';

dotenv.config();

const app = express();
connectDB();

// Create HTTP server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // allow all for now, better to restrict in prod
    methods: ["GET", "POST", "PATCH"],
    credentials: true,
  },
});

// Export io for use in other files if needed
export { io };

// Maintain participants mapping
let participants = {};
let votes = {}; // optional: keep poll results in memory

io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  // ========== Polls ==========
socket.on("createPoll", async (pollData) => {
  try {
    // Parse if string
    const parsed = typeof pollData === "string" ? JSON.parse(pollData) : pollData;

    console.log("Poll Data ----->", parsed);

    // Save poll to MongoDB
    const newPoll = new Poll({
      question: parsed.question,
      options: parsed.options.map((o) => ({
        id: Number(o.id),
        text: String(o.text),
        correct: Boolean(o.correct),
      })),
      timer: Number(parsed.timer),
      teacherUserName: parsed.teacherUsername,
    });
    // Broadcast poll to all clients
    io.emit("pollCreated", newPoll);
    await newPoll.save();
    console.log("Poll saved to MongoDB:", newPoll._id);
  } catch (err) {
    console.error("Error saving poll:", err);
    socket.emit("pollError", err.message);
  }
});

socket.on("vote", async ({ pollId, optionId }) => {
    try {
      const poll = await Poll.findOneAndUpdate(
        { _id: pollId, "options.id": optionId },
        { $inc: { "options.$.votes": 1 } },
        { new: true }
      );

      // Emit updated poll to all clients
      io.emit("pollUpdate", poll);  // teacher and students both can listen
    } catch (err) {
      console.error(err);
    }
  });


  socket.on("submitAnswer", ({ pollId, option, username }) => {
    console.log("Vote received:", pollId, option, username);

    // Broadcast updated votes to all clients
    io.emit("pollResults", { pollId, option, username });
  });

  // ========== Chat ==========
  socket.on("joinChat", ({ username }) => {
    console.log("---------------- Join Chat ------------------")
    participants[socket.id] = username;

    // Update participant list
    io.emit("participantsUpdate", Object.values(participants));
  });

  socket.on("chatMessage", (msg) => {
    // Broadcast message to ALL including sender
    io.emit("chatMessage", msg);
  });

  socket.on("kickOut", (usernameToKick) => {
    const socketIdToKick = Object.keys(participants).find(
      (id) => participants[id] === usernameToKick
    );

    if (socketIdToKick) {
      io.to(socketIdToKick).emit("kickedOut"); // tell kicked user
      io.sockets.sockets.get(socketIdToKick)?.disconnect(true); // force disconnect
      delete participants[socketIdToKick];
      io.emit("participantsUpdate", Object.values(participants)); // update list
      console.log(`${usernameToKick} was kicked out`);
    }
  });

  // ========== Disconnect ==========
  socket.on("disconnect", () => {
    const username = participants[socket.id];
    delete participants[socket.id];

    io.emit("participantsUpdate", Object.values(participants));
    console.log("Client disconnected:", socket.id, username);
  });
});


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors('*'));

app.use('/teacher-login', authRoute);
app.use('/api', PollRoute);

app.get('/', (req, res) => {
  res.send("Backend is Running 🔥");
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  console.log("ERROR:", message);
  res.status(statusCode).json({
    success: false,
    statusCode,
    message
  });
});

// Start Server with Socket.IO attached
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, '0.0.0.0', () => {
//   console.log(`Server is running on port ${PORT}`);
// });
export default app;