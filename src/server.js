import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from "path"
import cookieParser from 'cookie-parser';
import { fileURLToPath } from "url";
import swaggerUi from 'swagger-ui-express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import errorHandler from './middleware/errorHandler.js';
import connectDB from './config/database.js';

import specs from './config/swagger.js';
import authRouter from './api/auth/auth.router.js';
import usersRouter from './api/users/user.router.js';
import workspacesRouter from './api/workspaces/workspaces.router.js';
import { authenticate } from './middleware/auth.js';
import channelsRouter from './api/channels/channels.router.js';
import friendsRouter from './api/friends/friends.router.js';
import messagesRouter from './api/messages/messages.router.js';
import directMessagesRouter from './api/directMessages/directMessages.router.js';
import { io, app, server } from './config/socket.js';

// Attach socket instance to app for access in controllers
app.set('io', io);

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json({limit: '15mb'}));
app.use(cors({
  origin: `${process.env.FRONTEND_URL}`,
  credentials: true,
}));
app.use(helmet());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Error Handler
app.use(errorHandler);

// Routes
app.use('/api/auth', authRouter);
app.use(authenticate);
app.use('/api/users', usersRouter);
app.use('/api/workspaces', workspacesRouter);
app.use('/api/workspace/channels', channelsRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/direct-messages', directMessagesRouter);

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).send('Healthy');
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
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
