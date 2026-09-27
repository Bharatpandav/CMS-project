import express from 'express';
import connectDB from './config/db.js';
import userRouter from './routes/userRoutes.js';
import dotenv from 'dotenv';

import cookieParser from 'cookie-parser';

dotenv.config();

connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/users', userRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});