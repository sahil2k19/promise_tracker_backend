const express = require("express");
const Task = require("../modules/TaskSchema");
const Comments = require("../modules/Comments");
const app = express.Router();
let io;

const initializeSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};
app.get("/tasks", async (req, res) => {
  try {
    const taskGroups = await Task.find().sort({ createdAt: -1 });
    res.json(taskGroups);
  } catch (error) {
    console.error("Error fetching task groups:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/tasksedit/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const updateData = req.body;

    // Ensure only valid fields are updated
    const validFields = [
      'owner.id', 'owner.name', 'taskGroup', 'taskName', 'description', 'audioFile', 
      'pdfFile', 'people', 'startDate', 'endDate', 'reminder', 'status', 
      'category', 'comment', 'remark'
    ];

    // Construct the update object dynamically
    const updateFields = {};
    for (const field of validFields) {
      if (updateData.hasOwnProperty(field)) {
        updateFields[field] = updateData[field];
      }
    }

    // Update the task document
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    // If task not found, return 404
    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Return the updated task
    res.json(updatedTask);
  } catch (error) {
    console.error("Error editing task:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/tasks/:taskId/status", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    // Add "Archive" to the list of valid statuses, and keep the empty string as a valid status
    if (!["", "In Progress", "Completed", "Cancelled", "Archive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: { status } },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    io.emit('taskStatusUpdate', updatedTask);
    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ message: error.message });
 }
});

app.put("/tasks/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const newStatus = req.body.status;

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: { status: newStatus } },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    const taskGroups = await Task.find().sort({ createdAt: -1 });
    res.json(taskGroups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/countCompletedTasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    // console.log(userId, "userid");

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }


    
    const completedCountQuery = {
      people: { $elemMatch: { userId: userId } },
      status: "Completed",
    };

    const totalCountQuery = {
      people: { $elemMatch: { userId: userId } },
    };

    // Count tasks where status is 'Completed' for the given userId within the people array
    const completedCount = await Task.countDocuments(completedCountQuery);

    // Count total tasks for the given userId within the people array
    const totalCount = await Task.countDocuments(totalCountQuery);

    // Return both counts in the response
    res.json({ completedCount, totalCount });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching counts", error: error.message });
  }
});

app.get("/countTasksByGroup/:taskGroupName", async (req, res) => {
  try {
    // Get the task group name from path parameters
    const { taskGroupName } = req.params;

    // Count tasks where status is 'Completed' and belongs to the specific task group
    const completedCount = await Task.countDocuments({
      taskGroup: taskGroupName,
      status: "Completed",
    });

    // Count total tasks in the specific task group
    const totalCount = await Task.countDocuments({
      taskGroup: taskGroupName,
    });

    // Return both counts in the response
    res.json({ completedCount, totalCount });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching counts", error: error.message });
  }
});

app.put("/categoryedit/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { categoryAction, remark } = req.body;

    let status;
    let category;
    if (categoryAction === "Approved") {
      status = "Completed";
      category = "Approved";
    } else if (categoryAction === "Unapproved") {
      status = "In Progress";
      category = "Unapproved";
    } else {
      return res.status(400).json({ message: "Invalid category action" });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: { category, status, remark } },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task category:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/tasks/:taskId/cancel", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text, date } = req.body.remark || {}; // Extract text and date from request body

    if (!text || !date) {
      return res.status(400).json({ message: "Remark text and date are required" });
    }

    let updateData = {};

    // Check if the existing remark field is an array
    const existingTask = await Task.findById(taskId);
    if (Array.isArray(existingTask.remark)) {
      updateData = {
        $push: { remark: { text, date } }, // Push new remark object into the remark array
      };
    } else {
      updateData = {
        remark: [{ text, date }], // Convert the existing string to an array with the new remark object
      };
    }

    // Update the task document
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        ...updateData,
        $set: { status: "Cancelled" } // Set the status to Cancelled
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    io.emit('taskStatusUpdate', updatedTask);
    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task status to Cancelled:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/tasks/taskapprovals/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { endDate } = req.body;

    // Update task document
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: { 
          status: "In Progress",
          endDate,
          remark: [] // Clear remarks
        },
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task status to In Progress:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/category/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { category, status, remark } = req.body;

    const updatedCategory = await Task.findByIdAndUpdate(
      taskId,
      { $set: { category, status, remark } },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Task not found" });
    }

    const taskGroups = await Task.find().sort({ createdAt: -1 });
    res.json(taskGroups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post('/Comments', async (req, res) => {
  try {
    const { text, sender, taskId } = req.body;
    const newMessage = new Comments({ text, sender, taskId });
    await newMessage.save();
    res.status(201).json({ message: 'Message posted successfully' });
  } catch (error) {
    console.error('Error posting message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get("/comments/:taskId", async (req, res) => {
  try {
    const taskId = req.params.taskId;
    // Fetch comments for the specified task ID
    const comments = await Comments.find({ taskId });
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.put("/archiveOldTasks", async (req, res) => {
  try {
    const currentDate = new Date();
    const tasks = await Task.find();
    const updatedTasks = [];

    for (const task of tasks) {
      if (task.endDate) {
        const endDate = new Date(task.endDate);
        const diffTime = Math.abs(currentDate - endDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 30 && task.status !== "Archive") {
          task.status = "Archive";
          await task.save();
          updatedTasks.push(task);
        }
      }
    }

    res.json({ message: "Old tasks archived successfully", updatedTasks });
  } catch (error) {
    console.error("Error archiving old tasks:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/tasks/:taskId/complete", async (req, res) => {
  try {
      const { taskId } = req.params;
      const { text, file } = req.body; // Extract text and file (base64 encoded) from request body

      // Check if text is provided (it's required)
      if (!text) {
          return res.status(400).json({ message: "Text for proof of work is required" });
      }

      // Create the pow object with provided text and/or file
      let pow = { text };
      if (file) {
          pow.file = file; // Assuming file is already base64 encoded as a string
      }

      // Update the task document
      const updatedTask = await Task.findByIdAndUpdate(
          taskId,
          {
              $set: {
                  status: "Completed",
                  pow: pow
              }
          },
          { new: true }
      );

      if (!updatedTask) {
          return res.status(404).json({ message: "Task not found" });
      }
      io.emit('taskCompleted', updatedTask);
      res.json(updatedTask);
  } catch (error) {
      console.error("Error updating task status to Completed:", error);
      res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = { app, initializeSocketIo };

