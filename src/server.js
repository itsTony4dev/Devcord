import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import errorHandler from './middleware/errorHandler.js';
import connectDB from './config/database.js';

import authRouter from './api/users/auth.router.js';

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(helmet());

// Routes
app.use('/api/auth', authRouter);

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
