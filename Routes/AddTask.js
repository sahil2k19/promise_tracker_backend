const express = require("express");
const Task = require("../modules/TaskSchema");
const Notification = require("../modules/Notification");
const UserSchema = require("../modules/UserSchema");
const multer = require("multer");
const app = express.Router();
const { Expo } = require("expo-server-sdk");
const cors = require("cors");
const path = require("path");
const dotenv = require('dotenv');
const fs = require("fs");
const nodemailer = require("nodemailer");
dotenv.config();
let io;

const initializeSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};
const expo = new Expo();
app.use(cors());
const upload = multer({
  dest: "uploads/audio",
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/audio");
    },
    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname);
      cb(null, file.fieldname + "-" + Date.now() + extension);
    },
  }),
});

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


app.post("/tasks", upload.single("pdfFile"), async (req, res) => {
  try {
    const {
      owner,
      taskGroup,
      taskName,
      description,
      audioFile,
      people,
      startDate,
      endDate,
      reminder,
      status,
    } = req.body;
    const ownerId = owner.id;
    const ownerName = owner.name;
    const ownerprofilePic = owner.profilePic;
    const pdfFile = req.file ? req.file.path : null;
    // const pdfFile = req.files.pdfFile ? req.files.pdfFile[0].path : null;
    // const audioFile = req.files.audioFile ? req.files.audioFile[0].path : null;

    // console.log('taskgroup',taskGroup)

    const newTask = new Task({
      owner,
      taskGroup,
      taskName,
      description,
      audioFile,
      pdfFile,
      people,
      startDate,
      endDate,
      reminder,
      status: 'To do',
      createdAt: new Date(),
    });

    let taskNew = await newTask.save();

    const taskId = taskNew._id;

    for (const assignedUser of people) {
      const { userId, name } = assignedUser;

      const newNotification = new Notification({
        // profilePic : ownerprofilePic,
        title: `${ownerName} assigning task to you`,
        description: `Task Name: ${taskName}`,
        status: "pending",
        userId: userId,
        owner: {
          id: ownerId,
          name: ownerName,
          profilePic: ownerprofilePic,
        },
        taskId: taskId,
        created: new Date(),
        action: true,
      });
      await newNotification.save();
    }

    const allTasks = await Task.find();
    res.status(201).json({ newTask });
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// socket done here
app.post("/tasksadd", async (req, res) => {
  try {
    const { owner, taskGroup,isSubtask, subtaskDetail,taskName, description, audioFile, pdfFile, people, startDate, endDate, reminder, status, category, comment, remark } = req.body;

    // Extracting owner's ID
    const ownerId = owner.id;

    // Querying the database to get the owner's name by ID
    const ownerData = await UserSchema.findById(ownerId);
    const ownerName = ownerData.name;

    // Extracting owner's ID and name from people array
    const assignedUsers = people.map(user => ({ id: user.userId, name: user.name }));

    // Creating a new task object
    const newTask = new Task({
      owner: { id: ownerId, name: ownerName },
      taskGroup: {
        groupName: taskGroup.groupName,
        groupId: taskGroup.groupId
      },
      taskName,
      isSubtask,
      subtaskDetail,
      description,
      audioFile,
      pdfFile,
      people,
      startDate,
      endDate,
      reminder,
      status,
      category,
      comment,
      remark,
      createdAt: new Date(),
    });

    // Saving the new task
    const savedTask = await newTask.save();
    io.emit("newTask", savedTask);

    // Saving notifications and sending emails for assigned users
    const taskId = savedTask._id;
    for (const assignedUser of assignedUsers) {
      const userId = assignedUser.id;

      // Find user data to get the email
      const userData = await UserSchema.findById(userId);
      if (!userData) continue;

      const email = userData.email;
      const newNotification = new Notification({
        title: `${ownerName} assigning task to you`,
        description: `New task: ${taskName}`,
        userId,
        owner: {
          id: ownerId,
          name: ownerName,
        },
        taskId,
        created: new Date(),
        action: true,
      });

      await newNotification.save();
    }

    for (const user of people) {
      const userId = user.userId;

      // Fetch user data to get their email address
      const userData = await UserSchema.findById(userId);
      if (!userData) continue;

      const email = userData.email;
      const assignedUserName = userData.name;

      // Email details
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: `New Task Assigned: ${taskName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #dcdcdc; border-radius: 8px; overflow: hidden;">
            
            <header style="background-color: #1877F2; padding: 15px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 24px;">Task Assignment Notification</h2>
            </header>
            
            <main style="padding: 20px; margin: 10px; background-color: #f4f6f8; color: #333;">
              <p style="font-size: 16px; margin-bottom: 15px; margin-left: 15px; color:#5b5b5b;">Hello <strong>${assignedUserName}</strong>,</p>
              <p style="margin: 0 0 15px; margin-left: 15px; color:#5b5b5b;">You have been assigned a new task by <strong>${ownerName}</strong>. Please see the task details below:</p>
              
              <section style="background-color: white; margin: 10px; border: 1px solid #dcdcdc; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
                <h3 style="font-size: 18px; color: #1877F2; margin: 0 0 10px;">Task Details</h3>
                <p style="margin: 5px 0;"><strong>Task Name:</strong> ${taskName}</p>
                <p style="margin: 5px 0;"><strong>Description:</strong> ${description}</p>
                <p style="margin: 5px 0;"><strong>Start Date:</strong> ${startDate}</p>
                <p style="margin: 5px 0;"><strong>End Date:</strong> ${endDate}</p>
              </section>
              
              <p style="margin: 0 0 15px; margin-left: 15px; color:#5b5b5b;">You can log in to your account to view further details and manage your task assignments.</p>
            </main>
            
            <footer style="background-color: #f0f2f5; padding: 15px; text-align: center;">
              <p style="font-size: 14px; color: #666; margin: 0;">Best Regards,</p>
              <p style="font-size: 16px; color: #333; margin: 5px 0;">Your Task Management Team</p>
              <p style="font-size: 12px; color: #666; margin: 0;">webadmin@skanray-access.com</p>
            </footer>
            
          </div>
        `,
      };



      // Send email
      await transporter.sendMail(mailOptions);
    }



    io.emit("update_notification");
    // Responding with the newly created task
    res.status(201).json({ newTask: savedTask });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// DELETE Task API
app.delete("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    // Find and delete the task by its ID
    const deletedTask = await Task.findByIdAndDelete(taskId);

    if (!deletedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Emit a task deletion event to notify the connected clients
    io.emit("taskDeleted", taskId);

    res.status(200).json({ message: "Task deleted successfully", taskId });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 
app.post("/notifications/reply", async (req, res) => {
  try {
    const { userId, taskId, status, comment, startDate, endDate, action } = req.body;
    const user = await UserSchema.findById(userId);
    const task = await Task.findById(taskId);
    const taskName = task.taskName;
    const ownerId = task.owner.id;
    let description = `Task: ${taskName}`;
    if (comment) {
      description += `\nComment: ${comment}`;
    }
    let title;
    switch (status) {
      case "Accepted":
        title = `${user.name} accepted the task`;
        break;
      case "Rejected":
        title = `${user.name} rejected the task`;
        break;
      case "Accepted & Modified":
        title = `${user.name} accepted and  modified the task`;
        break;
      default:
        title = `${user.name} responded to the task`;
    }

    const newNotification = new Notification({
      title: title,
      description: description,
      status: status,
      userId: ownerId,
      owner: {
        id: userId,
        name: user.name,
        profilePic: user.profilePic,
      },
      taskId: taskId,
      created: new Date(),
      startDate: startDate,
      endDate: endDate,
      action: true,
    });


    await newNotification.save();
    io.emit("update_notification", newNotification);
    res
      .status(201)
      .json({ message: "Reply sent successfully", comment: comment });
  } catch (error) {
    console.error("Error replying to task notification:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/notifications/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    const userNotifications = await Notification.find({ userId: userId }).sort({ created: -1 });
    res.json(userNotifications);
  } catch (error) {
    console.error("Error retrieving user notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/notifications", async (req, res, next) => {
  try {
    const allNotifications = await Notification.find().sort({ created: -1 });
    res.json(allNotifications);
  } catch (error) {
    console.error("Error retrieving notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
    next(error);
  }
});

app.put("/notifications/mark-read", async (req, res, next) => {
  try {
    const notificationIds = req.body.notificationIds;

    // Find the notifications by IDs
    const notifications = await Notification.find({ _id: { $in: notificationIds } });

    // Update the status of found notifications to 'read'
    await Promise.all(notifications.map(async (notification) => {
      if (notification.status === 'unread') {
        notification.status = 'read';
        await notification.save();
      }
    }));

    res.json({ message: "Notifications marked as read successfully" });
  } catch (error) {
    console.error("Error updating notification status:", error);
    res.status(500).json({ error: "Internal Server Error" });
    next(error);
  }
});
// 
app.put("/tasks/update/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });
    if (!task) {
      return res.status(404).send({ message: "Task not found" });
    }
    io.emit("update_notification", task);

    res.status(200).send(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/notifications/:taskid", async (req, res) => {
  const { id } = req.params;
  const { title, description, status, owner, taskId } = req.body;
  try {
    const notification = await Notification.findByIdAndUpdate(
      id,
      {
        $set: {
          title,
          description,
          status,
          owner,
          taskId,
        },
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});
// 
app.put("/action/update/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    // console.log('id', userId);
    const updatedNotifications = await Notification.updateMany(
      { userId: userId, action: true },
      { $set: { action: false } }
    );
    if (updatedNotifications.nModified === 0) {
      return res.status(404).json({ error: 'No notifications found for this user' });
    }
    io.emit("update_notification", updatedNotifications);
    res.json({ message: 'Notifications updated successfully' });
  } catch (error) {

    console.error("Error updating notifications:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// app.patch('/statuscancel/:taskId', async (req, res) => {
//   try {
//     const updatedTask = await Task.findByIdAndUpdate(
//       req.params.taskId,
//       { status: 'Cancelled' },
//       { new: true }
//     );
//     res.json(updatedTask);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// });
// 
// GET Task by ID API
app.get("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;

    // Find the task by its ID
    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Responding with the task details
    res.status(200).json({ task });
  } catch (error) {
    console.error("Error retrieving task:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put('/updatetasks/:id', async (req, res) => {
  const { id } = req.params;
  const { comment, status, } = req.body;

  try {
    const updatedTask = await Task.findByIdAndUpdate(id, {
      $set: {
        // startDate,
        // endDate,
        // reminder,
        comment,
        status,
      }
    }, { new: true });

    if (!updatedTask) {
      return res.status(404).send('Task not found');
    }
    io.emit("update_notification", updatedTask);


    res.send(updatedTask);
  } catch (error) {
    res.status(400).send('Error updating task: ' + error.message);
  }
});


module.exports = { app, initializeSocketIo };

