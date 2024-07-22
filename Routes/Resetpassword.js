const express = require('express');
const router = express.Router();
const User = require('../modules/UserSchema'); 
const bcrypt = require('bcrypt');

router.post('/confirm-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const user = await User.findOne({ email });
  
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.resetOTP !== otp ) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOTP = null;
    await user.save();
    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/change-password', async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  try {
    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const user = await User.findOne({ _id: userId });
  
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    // user.resetOTP = null;
    await user.save();
    return res.json({ message: 'Password change successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
