import "dotenv/config";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

import User from "../../models/User.js";
import { generateToken } from "../../utils/security/generateToken.js";
import transporter from "../../utils/email/transporter.js";
import generateEmailVerification from "../../utils/email/templates/generateEmailVerification.js";
import generatePasswordResetConfirmation from "../../utils/email/templates/generatePasswordResetConfirmation.js";
import generatePasswordResetRequest from "../../utils/email/templates/generatePasswordReset.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usedTokens = new Set();

export const signup = async (req, res) => {
  try {
    const { username, password, confirmPassword, email } = req.body;
    if (
      username.trim() == "" ||
      password.trim() == "" ||
      confirmPassword.trim() == "" ||
      email.trim() == ""
    ) {
      return res
        .status(422)
        .json({ success: false, message: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return res
        .status(422)
        .json({ success: false, message: "Passwords do not match" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res
        .status(409)
        .json({ success: false, message: "Username must be unique" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    //Email validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return res
        .status(422)
        .json({ success: false, message: "Email is not valid" });
    }

    const user = await User.create({
      username,
      password: hashedPassword,
      email,
    });

    if (!user) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong! Please try again later.",
      });
    }
    //Email verification process
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });

    const url = `http://localhost:${process.env.PORT}/api/auth/verify/${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification",
      html: generateEmailVerification(username, url),
    });

    res.status(201).json({
      success: true,
      message: "Registration successful. Check your email for verification.",
    });
  } catch (error) {
    console.log("Error in signup controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email.trim()) {
      return res
        .status(422)
        .json({ success: false, message: "Email or username is required" });
    }
    if (!password.trim()) {
      return res
        .status(422)
        .json({ success: false, message: "Password is required" });
    }
    const user = await User.findOne({ email });
    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password || ""
    );
    if (!user || !isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res
        .status(403)
        .json({ success: false, message: "Email not verified" });
    }

    generateToken(user._id, res);

    return res.status(200).json({
      success: true,
      message: "User signed in successfully",
      data: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Error in signin controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const signout = (_req, res) => {
  try {
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
    });
    return res
      .status(200)
      .json({ success: true, message: "User signed out successfully" });
  } catch (error) {
    console.log("Error in signout controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.render("verification", {
        title: "Email Verification Error",
        message: "Invalid or expired verification link",
        icon: "✕",
        iconClass: "error",
        buttonText: "Back to Sign Up",
        buttonLink: `${process.env.FRONTEND_URL}/signup`,
        buttonClass: "error-button",
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.render("verification", {
        title: "Email Verification Error",
        message: "User not found",
        icon: "✕",
        iconClass: "error",
        buttonText: "Back to Sign Up",
        buttonLink: `${process.env.FRONTEND_URL}/signup`,
        buttonClass: "error-button",
      });
    }

    if (user.isVerified) {
      return res.render("verification", {
        title: "Already Verified",
        message:
          "Your email has already been verified. You can proceed to login.",
        icon: "ℹ",
        iconClass: "info",
        buttonText: "Go to Login",
        buttonLink: `${process.env.FRONTEND_URL}/login`,
        buttonClass: "info-button",
      });
    }

    user.isVerified = true;
    await user.save();

    return res.render("verification", {
      title: "Email Verified Successfully!",
      message:
        "Your email has been verified. You can now sign in to your account.",
      icon: "✓",
      iconClass: "success",
      buttonText: "Go to Login",
      buttonLink: `${process.env.FRONTEND_URL}/login`,
      buttonClass: "success-button",
    });
  } catch (error) {
    console.log("Error in verifyEmail controller: ", error.message);
    return res.render("verification", {
      title: "Email Verification Error",
      message: "An error occurred during verification",
      icon: "✕",
      iconClass: "error",
      buttonText: "Back to Sign Up",
      buttonLink: `${process.env.FRONTEND_URL}/signup`,
      buttonClass: "error-button",
    });
  }
};

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email.trim()) {
      return res
        .status(422)
        .json({ success: false, message: "Email is required" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.isVerified) {
      return res
        .status(409)
        .json({ success: false, message: "Email already verified" });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    const url = `http://localhost:8000/api/auth/verify/${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification",
      html: generateEmailVerification(user.username, url),
    });
    res.status(200).json({
      success: true,
      message: "A verification has been sent to your email",
    });
  } catch (error) {
    console.log("Error in resendVerificationEmail controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res
        .status(422)
        .json({ success: false, message: "Email is required" });
    }

    const standardResponse = {
      success: true,
      message: "A password reset link has been sent to your email",
    };

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json(standardResponse);
    }

    const tokenId = crypto.randomBytes(32).toString("hex");
    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        email: user.email,
        purpose: "password-reset",
        tokenId: tokenId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetUrl = `http://localhost:${process.env.PORT}/api/auth/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: generatePasswordResetRequest(user.username, resetUrl),
    });

    res.status(200).json(standardResponse);
  } catch (error) {
    console.log("Error in forgotPassword controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.render("verification", {
        title: "Reset Password Error",
        message: "Token is missing",
        icon: "✕",
        iconClass: "error",
        buttonText: "Try Again",
        buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
        buttonClass: "error-button",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.purpose !== "password-reset") {
        throw new Error("Invalid token purpose");
      }

      if (usedTokens.has(decoded.tokenId)) {
        return res.render("verification", {
          title: "Reset Password Error",
          message:
            "This reset link has already been used. Please request a new one.",
          icon: "✕",
          iconClass: "error",
          buttonText: "Request New Link",
          buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
          buttonClass: "error-button",
        });
      }

      return res.render("reset-password", {
        username: decoded.username,
        email: decoded.email,
        token: token,
      });
    } catch (error) {
      return res.render("verification", {
        title: "Reset Password Error",
        message: "Invalid or expired reset link",
        icon: "✕",
        iconClass: "error",
        buttonText: "Try Again",
        buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
        buttonClass: "error-button",
      });
    }
  } catch (error) {
    console.log("Error in reset redirect: ", error.message);
    return res.render("verification", {
      title: "Server Error",
      message: "An error occurred while processing your request",
      icon: "✕",
      iconClass: "error",
      buttonText: "Try Again",
      buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
      buttonClass: "error-button",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.purpose !== "password-reset") {
        throw new Error("Invalid token purpose");
      }

      if (usedTokens.has(decoded.tokenId)) {
        return res.render("verification", {
          title: "Reset Password Error",
          message:
            "This reset link has already been used. Please request a new one.",
          icon: "✕",
          iconClass: "error",
          buttonText: "Request New Link",
          buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
          buttonClass: "error-button",
        });
      }
    } catch (error) {
      return res.render("verification", {
        title: "Reset Password Error",
        message: "Invalid or expired reset link",
        icon: "✕",
        iconClass: "error",
        buttonText: "Try Again",
        buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
        buttonClass: "error-button",
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.render("verification", {
        title: "Reset Password Error",
        message: "User not found",
        icon: "✕",
        iconClass: "error",
        buttonText: "Try Again",
        buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
        buttonClass: "error-button",
      });
    }

    if (!password || !password.trim()) {
      return res.render("verification", {
        title: "Reset Password Error",
        message: "New password is required",
        icon: "✕",
        iconClass: "error",
        buttonText: "Try Again",
        buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
        buttonClass: "error-button",
      });
    }

    if (password !== confirmPassword) {
      return res.render("verification", {
        title: "Reset Password Error",
        message: "Passwords do not match",
        icon: "✕",
        iconClass: "error",
        buttonText: "Try Again",
        buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
        buttonClass: "error-button",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(
      user._id,
      { password: hashedPassword },
      { new: true }
    );

    usedTokens.add(decoded.tokenId);

    if (usedTokens.size > 1000) {
      usedTokens.clear();
    }

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Password Reset Successful",
      html: generatePasswordResetConfirmation(user.username),
    });

    return res.render("verification", {
      title: "Password Reset Successful!",
      message:
        "Your password has been changed successfully. You can now login with your new password.",
      icon: "✓",
      iconClass: "success",
      buttonText: "Go to Login",
      buttonLink: `${process.env.FRONTEND_URL}/login`,
      buttonClass: "success-button",
    });
  } catch (error) {
    console.log("Error in resetPassword controller: ", error.message);
    return res.render("verification", {
      title: "Server Error",
      message: "An error occurred while resetting your password",
      icon: "✕",
      iconClass: "error",
      buttonText: "Try Again",
      buttonLink: `${process.env.FRONTEND_URL}/forgot-password`,
      buttonClass: "error-button",
    });
  }
};
