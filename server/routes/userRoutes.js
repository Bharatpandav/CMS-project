import express from 'express';
import { loginUser, registerUser, adminLogin, logoutUser} from '../controller/authController.js';    


const userRouter = express.Router();

userRouter.post('/register', registerUser); // Route for user registration
userRouter.post('/login', loginUser); // Route for user login  
userRouter.post('/logout', logoutUser);     
userRouter.post('/admin', adminLogin); // Route for admin login

export default userRouter;