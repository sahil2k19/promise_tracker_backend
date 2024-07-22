
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  owner: { id: String, name: String, profilePic: String },
  // taskGroup:{ id: String, name: String },
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
    text: { type: String, },
    date: { type: String, }
  },
  pow: {
    text: { type: String },
    file: { type: String } 
  },

  createdAt: { type: Date }
});
const Task = mongoose.model('Task', taskSchema);
module.exports = Task;

