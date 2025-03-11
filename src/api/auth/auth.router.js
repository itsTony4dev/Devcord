import express from "express";
const authRouter = express.Router();
import {
  signin,
  signout,
  signup,
  verifyEmail,
  resendVerificationEmail,
  resetPassword,
  forgotPassword,
  changePassword
} from "./auth.controller.js";

import sendEmailLimiter from "../../middleware/sendEmailLimiter.js";

authRouter.route("/signup").post(signup);
authRouter.route("/signin").post(signin);
authRouter.route("/signout").post(signout);
authRouter.route("/verify/:token").get(verifyEmail);
authRouter.route("/resend-verification").post(sendEmailLimiter, resendVerificationEmail);
authRouter.route("/forgot-password").post(sendEmailLimiter, forgotPassword);
authRouter.route("/reset-password/").get(resetPassword);
authRouter.route("/change-password").post(changePassword);

export default authRouter;
