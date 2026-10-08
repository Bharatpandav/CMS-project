import 'dotenv/config';

import express from 'express';
import connectDB from './config/db.js';
import userRouter from './routes/userRoutes.js';
import complaintRouter from './routes/complaintRoutes.js';
import cookieParser from 'cookie-parser';

connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/complaints', complaintRouter);
app.use('/api/user', userRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});