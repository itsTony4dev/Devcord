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
  resetRedirect
} from "./auth.controller.js";

authRouter.route("/signup").post(signup);
authRouter.route("/signin").post(signin);
authRouter.route("/signout").post(signout);
authRouter.route("/verify/:token").get(verifyEmail);
authRouter.route("/resend-verification").post(resendVerificationEmail);
authRouter.route("/forgot-password").post(forgotPassword);
authRouter.route("/reset-password/:token").get(resetRedirect);
authRouter.route("/reset-password").post(resetPassword);

export default authRouter;
