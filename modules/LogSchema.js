const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  action: { type: String, required: true }, // e.g., 'create', 'assign', 'approve', 'reject', 'complete', 'edit', 'changeStatus'
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  details: { 
    type: mongoose.Schema.Types.Mixed,
    member: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] 
  }
});

const Log = mongoose.model('Log', logSchema);
module.exports = Log;