import 'dotenv/config';

import express from 'express';
import connectDB from './config/db.js';
import userRouter from './routes/userRoutes.js';
import complaintRouter from './routes/complaintRoutes.js';
import userManagementRouter from './routes/userManagementRoutes.js';
import hodRouter from './routes/hodRoutes.js';
import vcRouter from './routes/vcRoutes.js';
import deanRouter from './routes/deanRoutes.js';
import studentRouter from './routes/studentRoutes.js';
import dashboardStreamRouter from './routes/dashboardStreamRoutes.js';
import cookieParser from 'cookie-parser';
import { startComplaintSchedulers } from './cron/deadlineCron.js';

connectDB();

const app = express();

app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());

app.use('/api/complaints', complaintRouter);
app.use('/api/user', userRouter);
app.use('/api/users', userManagementRouter);
app.use('/api/hod', hodRouter);
app.use('/api/vc', vcRouter);
app.use('/api/dean', deanRouter);
app.use('/api/student', studentRouter);
app.use('/api/dashboard', dashboardStreamRouter);

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large' || error?.status === 413) {
    return res.status(413).json({
      success: false,
      message:
        'The complaint is too large. Remove an image or use a smaller photo, then submit again.'
    });
  }
  return next(error);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startComplaintSchedulers();
});