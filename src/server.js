import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from "path"
import cookieParser from 'cookie-parser';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import errorHandler from './middleware/errorHandler.js';
import connectDB from './config/database.js';

import authRouter from './api/auth/auth.router.js';
import userRouter from './api/users/user.router.js';
import workspacesRouter from './api/workspaces/workspaces.router.js';
import { authenticate } from './middleware/auth.js';

const app = express();

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());
app.use(cors({
  origin: `${process.env.FRONTEND_URL}`,
  credentials: true,
}));
app.use(helmet());

// Routes
app.use('/api/auth', authRouter);
app.use(authenticate);
app.use('/api/users', userRouter);
app.use('/api/workspaces', workspacesRouter)

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).send('Healthy');
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log("SIGTERM received. Closing server...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log("SIGINT received (Ctrl+C). Closing server...");
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
