const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: { type: String, },
  sender: { type: String, },
  taskId: {type: String},
  timestamp: { type: Date, default: Date.now }
});

const Comments = mongoose.model('Message', messageSchema);

module.exports = Comments;
