const express = require('express');
const Comment = require('../modules/CommentSchema'); // Comment schema
// const User = require('../modules/UserSchema'); // User schema
// const Task = require('../modules/Task'); // Task schema
const commentRouter = express.Router();

// Add a new comment
commentRouter.post('/add', async (req, res) => {
  try {
    const { text, userId, taskId, file } = req.body;

    if (!userId || !taskId || !text) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const newComment = new Comment({
      text,
      userId,
      taskId,
      file
    });

    const savedComment = await newComment.save();
    res.status(201).json(savedComment);
  } catch (error) {
    res.status(500).json({ message: "Error adding comment.", error });
  }
});

// Get a comment's details by commentId
commentRouter.get('/get/:commentId/commentDetail', async (req, res) => {
  try {
    const { commentId } = req.params;
    const comment = await Comment.findById(commentId).populate('userId taskId');
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }
    res.status(200).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching comment.", error });
  }
});

// Get all comments by a user (userId)
commentRouter.get('/get/:userId/allUserComment', async (req, res) => {
  try {
    const { userId } = req.params;
    const comments = await Comment.find({ userId }).populate('taskId');
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user comments.", error });
  }
});

// Get all comments by a user in a task
commentRouter.get('/get/:userId/:taskId/allUserCommentInTask', async (req, res) => {
  try {
    const { userId, taskId } = req.params;
    const comments = await Comment.find({ userId, taskId });
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching comments.", error });
  }
});

// Get all comments by taskId
commentRouter.get('/get/:taskId/allCommentByTask', async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await Comment.find({ taskId }).populate('userId');
    res.status(200).json(comments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching task comments.", error });
  }
});

// Get the latest comment by taskId
commentRouter.get('/get/:taskId/latestComment', async (req, res) => {
  try {
    const { taskId } = req.params;
    const latestComment = await Comment.findOne({ taskId }).sort({ createdAt: -1 });
    if (!latestComment) {
      return res.status(404).json({ message: "No comments found for this task." });
    }
    res.status(200).json(latestComment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching latest comment.", error });
  }
});

// Update a comment by commentId
commentRouter.put('/update/:commentId/updateComment', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text, file } = req.body;

    const updatedComment = await Comment.findByIdAndUpdate(commentId, { text, file }, { new: true });
    if (!updatedComment) {
      return res.status(404).json({ message: "Comment not found." });
    }
    res.status(200).json(updatedComment);
  } catch (error) {
    res.status(500).json({ message: "Error updating comment.", error });
  }
});

// Delete a comment by commentId
commentRouter.delete('/delete/:commentId/deleteComment', async (req, res) => {
  try {
    const { commentId } = req.params;

    const deletedComment = await Comment.findByIdAndDelete(commentId);
    if (!deletedComment) {
      return res.status(404).json({ message: "Comment not found." });
    }
    res.status(200).json({ message: "Comment deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Error deleting comment.", error });
  }
});

module.exports = commentRouter;
