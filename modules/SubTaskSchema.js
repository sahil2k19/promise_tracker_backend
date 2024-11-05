const mongoose = require('mongoose');

const subTaskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subTaskName: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['pending', 'done'], default: 'pending' },
  startDate: { type: Date },
  endDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
  parentTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  assignedTo:{type:mongoose.Schema.Types.Mixed}
});

const SubTask = mongoose.model('SubTask', subTaskSchema);

module.exports = SubTask;
