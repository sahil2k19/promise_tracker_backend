const express = require("express");
const mongoose = require("mongoose");

const registerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobilenumber: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  profilePic: { type: String },
  department: { type: String },
  designation: { type: String },
  userRole: { type: Number, },
  resetOTP:{type:Number},
  active: {
    type: Boolean,
    default: true // Assuming users are active by default
  },
});
const User = mongoose.model("User", registerSchema);
module.exports = User;