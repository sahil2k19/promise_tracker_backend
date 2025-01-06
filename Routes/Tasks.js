const express = require("express");
const Task = require("../modules/TaskSchema");
const GroupSchema = require('../modules/TGroupSchema');
const UserSchema = require("../modules/UserSchema");
const nodemailer = require("nodemailer");
const dotenv = require('dotenv');
const cors = require("cors");
const path = require("path");
const app = express.Router();
dotenv.config();
let io;
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,  // Use 465 if secure is set to true
  secure: false,  // Set to true for port 465, false for port 587
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,  // Make sure this is your App Password, not your actual Gmail password
  },
  tls: {
    rejectUnauthorized: false,  // Allows self-signed certificates; optional but often needed with Gmail
  },
});
const initializeSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};
app.get("/tasks", async (req, res) => {
  try {
    const taskGroups = await Task.find()
      .sort({ createdAt: -1 })
      .populate({
        path: 'subtaskDetail.parentTaskId',  // Populate the parent task reference
        select: 'taskName'  // Only select the taskName field from the parent task
      });

    res.json(taskGroups);
  } catch (error) {
    console.error("Error fetching task groups:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get('/subtasks', async (req, res) => {
  try {
    // Fetch tasks where isSubtask is true and status is "In Progress"
    const subtasks = await Task.find({ isSubtask: true, status: "In Progress" });
    res.status(200).json({ success: true, data: subtasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
    res.status(500).json({ message: error.message });
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
      status = "Archive";
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
    const { remark } = req.body || {}; // Extract text and date from request body

    if (!remark?.text || !remark?.date) {
      return res.status(400).json({ message: "Remark text and date are required" });
    }

    let updateData = {};

    // Check if the existing remark field is an array
    const existingTask = await Task.findById(taskId);
    if (Array.isArray(existingTask.remark)) {
      updateData = {
        $push: { remark: remark }, // Push new remark object into the remark array
      };
    } else {
      updateData = {
        remark: [remark], // Convert the existing string to an array with the new remark object
      };
    }

    // Update the task document
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        ...updateData,
        $set: { status: "Cancelled", additionalDetails: {} } // Set the status to Cancelled
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

// app.post('/Comments', async (req, res) => {
//   try {
//     const { text, sender, taskId } = req.body;
//     const newMessage = new Comments({ text, sender, taskId });
//     await newMessage.save();
//     res.status(201).json({ message: 'Message posted successfully' });
//   } catch (error) {
//     console.error('Error posting message:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });

// app.get("/comments/:taskId", async (req, res) => {
//   try {
//     const taskId = req.params.taskId;
//     // Fetch comments for the specified task ID
//     const comments = await Comments.find({ taskId });
//     res.json(comments);
//   } catch (error) {
//     console.error('Error fetching comments:', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });
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
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.put("/tasks/:taskId/complete", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { text, file, userId } = req.body; // Extract text, file, and completer's userId from request body

    // Check if text is provided (it's required)
    if (!text) {
      return res.status(400).json({ message: "Text for proof of work is required" });
    }

    // Find the completer's details
    const completer = await UserSchema.findById(userId);
    if (!completer) {
      return res.status(404).json({ message: "Completer not found" });
    }

    // Create the pow object with provided text and/or file
    let pow = { text };
    if (file) {
      pow.file = file; // Assuming file is already base64 encoded as a string
    }

    // Update the task status to "Completed"
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

    // Fetch task owner's details for sending the email
    const taskOwner = await UserSchema.findById(updatedTask.owner.id);
    if (!taskOwner) {
      return res.status(404).json({ message: "Task owner not found" });
    }

    // Email options to notify the task owner
    const emailOptions = {
      from: process.env.GMAIL_USER,
      to: taskOwner.email,
      subject: `Task "${updatedTask.taskName}" Completed by ${completer.name}`,
      html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <header style="background-color: #1877F2; padding: 15px; text-align: center; color: white;">
                      <h2 style="margin: 0;">Task Completion Notification</h2>
                  </header>
                  <main style="padding: 20px;">
                      <p>Hello <strong>${taskOwner.name}</strong>,</p>
                      <p>Your task "<strong>${updatedTask.taskName}</strong>" has been completed by <strong>${completer.name}</strong>.</p>
                      <p><strong>Proof of Work:</strong> ${text}</p>
                      ${file ? `<p><strong>Attached File:</strong> [Base64 file data]</p>` : ''}
                  </main>
                  <footer style="background-color: #f0f2f5; padding: 15px; text-align: center;">
                      <p>Best Regards,</p>
                      <p>Your Task Management Team</p>
                  </footer>
              </div>
          `
    };

    // Send email to the task owner
    await transporter.sendMail(emailOptions);

    // Emit real-time event
    io.emit('taskCompleted', updatedTask);

    // Respond with the updated task details
    res.json(updatedTask);

  } catch (error) {
    console.error("Error updating task status to Completed:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// get all the task for approval if user is deptHead or projectLead
app.get('/tasks/deptHead_projectLead/:userId/all_approval_task', async (req, res) => {
  const { userId } = req.params;
  try {
    // Find all the groups where userId is deptHead
    const taskGroupsDeptHead = await GroupSchema.find({ "deptHead.userId": userId }).select('_id');

    // Find all the groups where userId is projectLead
    const taskGroupsProjectLead = await GroupSchema.find({ "projectLead.userId": userId }).select('_id');

    // Find all the tasks where userId is the owner
    const userOwnTask = await Task.find({ "owner.id": userId });

    // Merge group IDs from both queries
    const groupIdArray = [...taskGroupsDeptHead, ...taskGroupsProjectLead].map(group => group._id);

    // Find tasks belonging to the groups
    const tasks = await Task.find({ "taskGroup.groupId": { $in: groupIdArray } });

    // Combine tasks from both queries
    const result = [...tasks, ...userOwnTask];

    // Remove duplicates by filtering unique task ids
    const uniqueResult = Array.from(new Set(result.map(task => task._id.toString())))
      .map(id => result.find(task => task._id.toString() === id));

    return res.json({ result: uniqueResult, tasksCount: tasks.length, userOwnTaskCount: userOwnTask.length });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});


// get all the task for approval if user is admin
app.get('/tasks/get_all_task_for_approve/:userId/all_approval_task', async (req, res) => {
  const { userId } = req.params;
  try {
    const tasks = await Task.find()

    return res.json(tasks)
  } catch (error) {
    return res.status(500).json({ message: error.message })
  }
})



app.put('/tasks/:taskId/reject_postponed', async (req, res) => {
  const { taskId } = req.params;
  const remark = req.body.remark;

  try {
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          "additionalDetails.remarks": remark,
          "additionalDetails.status": "rejected"
        }
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.json(updatedTask);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});
module.exports = { app, initializeSocketIo };

app.get('/tasks/canEdit/:taskId/:userId/canEdit', async (req, res) => {
  const { taskId, userId } = req.params;
  try {
    // Find the task by its ID
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if the user is the owner of the task
    if (task.owner.id === userId) {
      return res.json(true);
    }

    // Find the task group by its groupId
    const taskGroup = await GroupSchema.findOne({ groupId: task.taskGroup.groupId });
    if (!taskGroup) {
      return res.status(404).json({ message: "Task group not found" });
    }

    // Check if the user is a deptHead or projectLead in the task group
    const isDeptHead = taskGroup.deptHead.some(member => member.userId === userId);
    const isProjectLead = taskGroup.projectLead.some(lead => lead.userId === userId);

    if (isDeptHead || isProjectLead) {
      return res.json(true);
    }

    // If the user is neither the owner, nor a deptHead, nor a projectLead
    return res.json(false);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

