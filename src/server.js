import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';


import errorHandler from './api/middleware/errorHandler.js'
import connectDB from './config/database.js';

import authRouter from './api/routes/auth.router.js';


const app = express();


//Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(helmet());


//Routes
app.use('/api/v1', require('./api/routes/v1'));
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
