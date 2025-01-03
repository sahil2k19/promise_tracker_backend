const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  owner: { id: String, name: String, profilePic: String },
  taskGroup: {
    groupName: { type: String },
    groupId: { type: String }
  },
  taskName: { type: String },
  description: { type: String },
  audioFile: { type: String },
  pdfFile: { type: String },
  people: [{ userId: String, name: String }],
  startDate: { type: String },
  endDate: { type: String },
  reminder: { type: String },
  status: { type: String },
  category: { type: String },
  comment: { type: String },
  remark: {
    text: { type: String },
    date: { type: String }
  },
  pow: {
    text: { type: String },
    file: { type: String }
  },

  // Flexible field for additional details with nested objects and arrays
  additionalDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
    // Field to indicate if the task is a subtask
    isSubtask: { type: Boolean, default: false },

    // Subtask details
    subtaskDetail: {
      parentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task'} // Reference to the parent task
    },
  

  createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;
