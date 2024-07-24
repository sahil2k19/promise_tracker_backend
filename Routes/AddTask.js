const express = require("express");
const Task = require("../modules/TaskSchema");
const Notification = require("../modules/Notification");
const UserSchema = require("../modules/UserSchema");
const multer = require("multer");
const app = express.Router();
const { Expo } = require("expo-server-sdk");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
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

app.post("/tasksadd", async (req, res) => {
  try {
    const { owner, taskGroup, taskName, description, audioFile, pdfFile, people, startDate, endDate, reminder, status, category, comment, remark } = req.body;

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
    // Saving notifications for assigned users
    const taskId = savedTask._id;
    for (const assignedUser of assignedUsers) {
      const userId = assignedUser.id; // Extract userId from assignedUser object

      const newNotification = new Notification({
        title: `${ownerName} assigning task to you`,
        description: `New task: ${taskName}`,
        userId: userId, // Use extracted userId
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

    // Responding with the newly created task
    res.status(201).json({ newTask: savedTask });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Internal Server Error" });
}
});

app.post("/notifications/reply", async (req, res) => {
  try {
    const { userId, taskId, status, comment,  startDate, endDate, action } = req.body;
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

    const userNotifications = await Notification.find({ userId: userId }).sort({created: -1});
    res.json(userNotifications);
  } catch (error) {
    console.error("Error retrieving user notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/notifications", async (req, res, next) => {
  try {
    const allNotifications = await Notification.find().sort({created: -1});
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

app.put("/tasks/update/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findByIdAndUpdate(taskId, updates, { new: true });
    if (!task) {
      return res.status(404).send({ message: "Task not found" });
    }

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

    res.send(updatedTask);
  } catch (error) {
    res.status(400).send('Error updating task: ' + error.message);
  }
});


module.exports = { app, initializeSocketIo };

