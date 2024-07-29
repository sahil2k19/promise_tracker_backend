const express = require('express');
const router = express.Router();
const SubTaskSchema = require('../modules/SubTaskSchema'); // Replace with your actual User model
const UserSchema = require('../modules/UserSchema'); // Replace with your actual User model
const TaskSchema = require('../modules/TaskSchema');

const checkUser = async (req, res, next) => {
    const { userId } = req.body;
   try {
    const user = await UserSchema.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    next();
   } catch (error) {
        return res.json({ message: error.message });
   }    
  };


  router.post('/subtask', checkUser, async (req, res) => {
    const { userId } = req.body;
    const taskData = { ...req.body };
  
    try {
      const task = new SubTaskSchema(taskData);
      await task.save();
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.put('/subtask/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    const taskData = { ...req.body };
  
    try {
      const task = await SubTaskSchema.findByIdAndUpdate(id, taskData, { new: true });
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  router.delete('/subtask/:id',  async (req, res) => {
    const { id } = req.params;
  
    try {
      const task = await SubTaskSchema.findByIdAndDelete(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.json({ message: 'Task deleted successfully' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // find subtask detail

  router.get('/subtask/:id/sub_task',  async (req, res) => {
    const { id } = req.params;
    try {
      const task = await SubTaskSchema.findById(id);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
// find all subtasks of current userId
router.get('/subtask/:userId/user_tasks', async (req, res) => {
  const { userId } = req.params;
  try {
    const tasks = await SubTaskSchema.find({ userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// find all subtasks of current TAsks
router.get('/subtask/:parentTask/task/:userId/user_tasks', async (req, res) => {
  const { parentTask,userId } = req.params;
  try {
    const tasks = await SubTaskSchema.find({ parentTask,userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

  // find all assigned task of current userId
  router.get('/subtask/assigned/:userId', async (req, res) => {
    const { userId } = req.params;
  
    try {
      const tasks = await TaskSchema.find({ 'people.userId': userId,  }).exec();
      res.status(200).json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Server error', error });
    }
  });
  


module.exports = router;
