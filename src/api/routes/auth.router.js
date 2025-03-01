import express from "express";
const router = express.Router();

import {
  signin,
  signout,
  signup,
  verifyEmail,
  resendVerificationEmail,
} from "../controller/auth.controller.js";

router.route("/signup").post(signup);
router.route("/signin").post(signin);
router.route("/signout").post(signout);
router.route("/verify/:token").get(verifyEmail);
router.route("/resend-verification").post(resendVerificationEmail);

export default router;
