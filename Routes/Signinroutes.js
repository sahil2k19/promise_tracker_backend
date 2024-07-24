const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Register = require('../modules/UserSchema');
const Router = express.Router();
const Signin = require('../modules/Signin');
const bcrypt = require('bcrypt');
const { sendMail } = require('../services/mail');
const secretKey = 'mytestsecretkey'

// Replace 'your-generated-secret-key' with the key generated using the provided script


Router.post('/Signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await Register.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }
    if(!user.active){
      return res.status(404).json({ message: 'Account deactivated , contact admin' });
    }

    // Check if the password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Create a JSON Web Token (JWT)
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      secretKey    );
      
      // console.log(token);
      const replacements = { name:user?.name, email:user?.email };
      const emailTemplate = '../Email_Templates/loginSuccess.html';
      const subject = 'SuccessFully Login';
      // sendMail(email, subject ,replacements, emailTemplate, (error, info) => {
      //   if (error) {
      //     console.log(error);
      //   }else{
      //     console.log('Email sent: ' + info.response);
      //   }
      // })
      res.status(200).json(
        { 
          name: user?.name,
          email: user?.email,
          userId: user?._id,
          token, 
          active: user?.active,
          userRole: user?.userRole,
          profilePic:user?.profilePic,
          department: user?.department,
          designation: user?.designation,
          mobilenumber: user?.mobilenumber,
        
        });
      } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = Router;
