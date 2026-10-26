import 'dotenv/config';

import express from 'express';
import connectDB from './config/db.js';
import userRouter from './routes/userRoutes.js';
import complaintRouter from './routes/complaintRoutes.js';
import userManagementRouter from './routes/userManagementRoutes.js';
import cookieParser from 'cookie-parser';

connectDB();

const app = express();

app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());

app.use('/api/complaints', complaintRouter);
app.use('/api/user', userRouter);
app.use('/api/users', userManagementRouter);

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
});