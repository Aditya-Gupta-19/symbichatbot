// backend/server.js

import express from "express";
import cors from "cors";
import "dotenv/config";
import jwt from 'jsonwebtoken';
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";

import './models/userModel.js';
import './models/doctorModel.js';
import './models/appointmentModel.js';
import './models/ChatMessage.js';

import ChatMessage from "./models/ChatMessage.js";
import Appointment from './models/appointmentModel.js';

import userRouter from "./routes/userRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import adminRouter from "./routes/adminRoute.js";
import fetchDoctorRouter from "./routes/fetchDoctors.js";
import analyzeRoute from "./routes/analyseRoute.js";
import chatApiRouter from './routes/chatApiRoutes.js';

const app = express();
const port = process.env.PORT || 4000;

// List all allowed frontend URLs
const allowedOrigins = [
    process.env.USER_FRONTEND_URL || "http://localhost:5173",
    process.env.ADMIN_FRONTEND_URL || "http://localhost:5174",
];

// Middleware
app.use(express.json());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS Blocked: ${origin}`);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
}));

// HTTP server + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
    }
});

// Socket.IO JWT Auth
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: Token missing"));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { userId: decoded.id };
        next();
    } catch (err) {
        console.error("Invalid token", err.message);
        return next(new Error("Authentication error: Invalid token"));
    }
});

// Socket.IO Chat Events
io.on("connection", (socket) => {
    console.log(`Socket Connected: ${socket.id}, User: ${socket.user?.userId}`);

    socket.on("joinRoom", async ({ appointmentId }) => {
        const userId = socket.user.userId;
        try {
            const appointment = await Appointment.findById(appointmentId);
            if (!appointment || (appointment.userId.toString() !== userId && appointment.docId.toString() !== userId)) {
                return socket.emit('joinError', { message: 'Unauthorized or not found' });
            }
            socket.join(appointmentId);
        } catch (error) {
            console.error(error);
            socket.emit('joinError', { message: 'Server error' });
        }
    });

    socket.on("sendMessage", async ({ appointmentId, message }) => {
        const senderId = socket.user.userId;
        if (!appointmentId || !message || !socket.rooms.has(appointmentId)) {
            return socket.emit('sendError', { message: 'Invalid request' });
        }
        try {
            const newMessage = new ChatMessage({ appointmentId, sender: senderId, message: message.trim() });
            const savedMessage = await newMessage.save();
            io.to(appointmentId).emit("receiveMessage", savedMessage.toObject());
        } catch (error) {
            console.error(error);
            socket.emit('sendError', { message: 'Failed to send' });
        }
    });

    socket.on("disconnect", () => {
        console.log(`Socket Disconnected: ${socket.id}`);
    });
});

// DB & Cloudinary
connectDB();
connectCloudinary();

// API Routes
app.use("/api/user", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/search-doctors", fetchDoctorRouter);
app.use("/api/analyze", analyzeRoute);
app.use('/api/chats', chatApiRouter);

// Health check
app.get("/", (req, res) => res.send("API is working"));

// Start server
server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
