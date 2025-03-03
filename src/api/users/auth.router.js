import express from "express";
const authRouter = express.Router();

import {
  signin,
  signout,
  signup,
  verifyEmail,
  resendVerificationEmail,
} from "./auth.controller.js";

authRouter.route("/signup").post(signup);
authRouter.route("/signin").post(signin);
authRouter.route("/signout").post(signout);
authRouter.route("/verify/:token").get(verifyEmail);
authRouter.route("/resend-verification").post(resendVerificationEmail);

export default authRouter;
