const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  text: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true }, 
  file: { type: String }, 
}, { timestamps: true }); 

const Comments = mongoose.model('Comment', commentSchema);

module.exports = Comments;