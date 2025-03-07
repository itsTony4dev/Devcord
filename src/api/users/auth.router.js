import express from "express";
const authRouter = express.Router();
import path from "path"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  signin,
  signout,
  signup,
  verifyEmail,
  resendVerificationEmail,
  resetPassword,
  forgotPassword,
} from "./auth.controller.js";

authRouter.use('/public', express.static(path.join(__dirname, '..', 'public')));

authRouter.route("/signup").post(signup);
authRouter.route("/signin").post(signin);
authRouter.route("/signout").post(signout);
authRouter.route("/verify/:token").get(verifyEmail);
authRouter.route("/resend-verification").post(resendVerificationEmail);
authRouter.route("/forgot-password").post(forgotPassword);
authRouter.route("/reset-password/:token").post(resetPassword);

export default authRouter;
