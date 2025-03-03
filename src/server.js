import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';


import errorHandler from './middleware/errorHandler.js'
import connectDB from './config/database.js';

import authRouter from './api/users/auth.router.js';


const app = express();


//Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(helmet());


//Routes
app.use('api/auth/', authRouter);


//Health Check
app.get('/health', (_req, res) => {
  res.status(200).send('Healthy');
});

//Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
})
