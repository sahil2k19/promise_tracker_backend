const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['unread', 'read' , "pending", "Accepted", "Accepted & Modified", "Rejected"], default: 'unread' },
  userId: { type: String},
  owner: {
    id: String, // Assuming you have an ownerId variable
    name: String,
    profilePic: String,
  },// Assuming 'owner' is a property in the notification
  taskId:{ type: String },
  created: { type: Date, default: Date.now },
  action:{ type: String },
  startDate: { type: String},
  endDate: { type: String},
});

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;