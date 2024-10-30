const express = require('express');
const router = express.Router();
const UserSchema = require('../modules/UserSchema'); // Replace with your actual User model
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// Function to generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Function to send the OTP email
const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    logger: true, // Enable logging
    debug: true, // Show debug information
  });

  const mailOptions = {
    from: process.env.GMAIL_USER, // Use the authenticated user's email
    to: email,
    subject: 'Password Reset Link',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p style="color: #555;">Dear User,</p>
        <p style="color: #555;">We received a request to reset your password. Please click the link below to reset your password:</p>
        <p style="text-align: start;">
          <a href="${otp}" style="background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        </p>
        <p style="color: #555;">If you did not request a password reset, please ignore this email.</p>
        <p style="color: #555;">Thank you!</p>
        <p style="color: #555;">Best regards,<br>Your SKANRAY Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Reset Link sent successfully');
  } catch (error) {
    console.error('Error sending reset OTP:', error);
    throw error;
  }
};

// Route to send password reset link
router.post('/reset-link', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Missing email parameter' });
    }

    const user = await UserSchema.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = user._id;
    const subject = 'Password Reset Link';
    const resetLink = `${process.env.CLIENT_URL}reset-password/${userId}`;
    const replacements = { resetLink };

    // Use the sendOTPEmail function instead of sendMail
    await sendOTPEmail(email, resetLink); // Sending the reset link directly via email
    console.log('Password reset link sent successfully to:', email);
    return res.json({ message: 'Password reset link sent successfully' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Route to set a new password
router.post('/set-password', async (req, res) => {
  const { userId, password } = req.body;

  try {
    if (!userId || !password) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const user = await UserSchema.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    return res.json({ message: 'Password set successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to request a password reset OTP
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: 'Missing email parameter' });
    }

    const user = await UserSchema.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const otp = generateOTP(); // Generate OTP

    // Save OTP in user document
    user.resetOTP = otp;
    user.resetOTPExpiration = Date.now() + 3600000; // Set OTP expiration time to 1 hour
    await user.save();

    // Send OTP to user's email
    await sendOTPEmail(email, otp);

    return res.json({ message: 'Password reset OTP sent successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
