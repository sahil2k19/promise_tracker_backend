const express = require('express');
const router = express.Router();
const UserSchema = require('../modules/UserSchema'); // Replace with your actual User model
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { sendMail } = require('../services/mail');
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
      user: 'nandannandu254@gmail.com',
      pass: 'hbpl hane patw qzqb',
    },
  });

  const mailOptions = {
    from: 'nandannandu254@gmail.com',
    to: email,
    subject: 'Password Reset OTP',
    text: `Your OTP for resetting the password is: ${otp}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    // console.log('Reset OTP sent successfully');
  } catch (error) {
    console.error('Error sending reset OTP:', error);
    throw error;
  }
};


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
    sendMail(
      email,
      subject,
      replacements,
      '../Email_Templates/resetLink.html',
      (error, info) => {
        if (error) {
          console.log(error);
          return res.json({ message: 'Error sending password reset link' });
        } else {
          console.log('Email sent: ' + info.response);
          return res.json({ message: 'Password reset link sent successfully' });
        }
      });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/set-password', async (req, res) => {
  const { userId, password } = req.body;
  try{
    if (!userId || !password) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const user = await UserSchema.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    return res.json({ message: 'Password set successfully' });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
})

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
    // user.resetOTPExpiration = Date.now() + 3600000; // Set OTP expiration time to 1 hour
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
