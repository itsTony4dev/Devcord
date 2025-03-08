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

import changePasswordLimiter from "../../middleware/changePasswordLimiter.js";

authRouter.route("/signup").post(signup);
authRouter.route("/signin").post(signin);
authRouter.route("/signout").post(signout);
authRouter.route("/verify/:token").get(verifyEmail);
authRouter.route("/resend-verification").post(resendVerificationEmail);
authRouter.route("/forgot-password").post(changePasswordLimiter, forgotPassword);
authRouter.route("/reset-password/").get(resetPassword);
authRouter.route("/change-password").post(changePassword);

export default authRouter;
