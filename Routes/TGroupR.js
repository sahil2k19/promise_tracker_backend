const express = require("express");
const TGroupSchema = require("../modules/TGroupSchema");
const Task = require("../modules/TaskSchema");
const LevelsRoutes = require("./RoleLevels");
const bodyParser = require('body-parser');
const User = require("../modules/UserSchema");
const app = express.Router();
const customBodyParserMiddleware = bodyParser.json({ limit: '100mb' });

app.post('/TGroups', customBodyParserMiddleware, async (req, res) => {
  try {
    let { groupName, deptHead, projectLead, members, profilePic } = req.body;

    deptHead = Array.isArray(deptHead) && deptHead.length > 0 ? deptHead[0] : deptHead;
    projectLead = Array.isArray(projectLead) && projectLead.length > 0 ? projectLead[0] : projectLead;

    const newTaskGroup = new TGroupSchema({
      groupName,     
      deptHead,
      projectLead,
      members,
      profilePic,
      createdAt: new Date(),
    });
  
    const savedTaskGroup = await newTaskGroup.save();
    const allTaskGroups = await TGroupSchema.find();
    res.status(201).json({ savedTaskGroup, allTaskGroups });
  } catch (error) {
    console.error("Error adding newGroup:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/allgroups/:userId", async (req, res) => {
  try {
    console.log('Received request for user ID:', req.params.userId);

    const userId = req.params.userId; // Get userId from route parameters

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Fetch the user role based on the userId
    const user = await User.findById(userId); // Assuming you have a UserSchema
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log('User found:', user);

    const userRole = user.userRole;

    let taskGroups;

    if (userRole === 0 || userRole === 1 || userRole === 2) {
      // Fetch all groups for admin, head, and lead roles
      taskGroups = await TGroupSchema.find().sort({ createdAt: -1 });
    } else if (userRole === 3) {
      // Fetch only the groups assigned to this member
      taskGroups = await TGroupSchema.find({ "members.userId": userId }).sort({ createdAt: -1 });
      
      // If no groups are found, return an empty array
      if (taskGroups.length === 0) {
        return res.json([]);
      }
    } else {
      return res.status(403).json({ error: "Unauthorized access" });
    }
    

    console.log('Task groups:', taskGroups);

    res.json(taskGroups);
  } catch (error) {
    console.error("Error fetching task groups:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// app.get("/TGroups", async (req, res) => {
//   try {
//     const taskGroups = await TGroupSchema.find().sort({ createdAt: -1 });

//     res.json(taskGroups);
//     // console.log("data", taskGroups);
//   } catch (error) {
//     console.error("Error fetching task groups:", error.message);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });
app.get("/groups", async (req, res) => {
  try {
    const taskGroups = await TGroupSchema.find().sort({ createdAt: -1 });
    res.json(taskGroups);
  } catch (error) {
    console.error("Error fetching task groups:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/TGroups", LevelsRoutes, async (req, res) => {
  // console.log("mem");
  try {
    const taskGroups = await TGroupSchema.find().sort({ createdAt: -1 });

    res.json(taskGroups);
  } catch (error) {
    console.error("Error fetching task groups:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = app;

// app.get("/TGroups", async (req, res) => {
//   // console.log(req)
//   try {
//     const taskGroups = await TGroupSchema.find().sort({ createdAt: -1 });
//     // console.log(res)

//     res.json(taskGroups);
//   } catch (error) {
//     console.error("Error fetching task groups:", error.message);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

//getting tasks using task group id

app.get("/tasks/:taskGroupId", async (req, res) => {
  try {
    const taskGroupId = req.params.taskGroupId;

    // Find the TaskGroup by ID
    const taskGroup = await TGroupSchema.findById(taskGroupId);
    // console.log(taskGroup, "get");

    if (!taskGroup) {
      return res.status(404).json({ message: "TaskGroup not found" });
    }

    // Find all tasks with the specified taskGroupId
    const tasks = await Task.find({ "taskGroup.id": taskGroupId });

    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get('/groups/:id', async (req, res) => {
  const groupId = req.params.id; // Extract group ID from request parameters

  try {
    const taskGroup = await TGroupSchema.findById(groupId);

    if (!taskGroup) {
      // If task group with the provided ID is not found, return 404 status
      return res.status(404).json({ message: "Task group not found" });
    }

    // If task group is found, return it in the response
    res.json(taskGroup);
  } catch (error) {
    // If an error occurs during database operation, return 500 status with error message
    console.error("Error fetching task group:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/group/:TGroupId", async (req, res) => {
  const TGroupId = req.params.TGroupId;
  const { groupName, members, profilePic, deptHead, projectLead } = req.body;
  
  console.log("Request body:", req.body);  // Log the incoming data

  try {
      const existingTGroup = await TGroupSchema.findById(TGroupId);
      if (!existingTGroup) {
          return res.status(404).json({ message: "Task Group not found" });
      }

      const updateList = (existingList, newList) => {
          // Ensure each item in newList has the necessary fields
          const validNewList = newList.filter(item => item && item.userId && item.name);
          const newIds = new Set(validNewList.map(item => item.userId));
          const filteredList = existingList.filter(item => item && !newIds.has(item.userId));
          return filteredList.concat(validNewList);
      };

      const updatedDeptHeads = updateList(existingTGroup.deptHead, deptHead);
      const updatedProjectLeads = updateList(existingTGroup.projectLead, projectLead);
      const updatedMembers = updateList(existingTGroup.members, members);

      const allUnique = Array.from(new Map(
          [...updatedDeptHeads, ...updatedProjectLeads, ...updatedMembers].map(item => [item.userId, item])
      ).values());

      const updatedTGroup = await TGroupSchema.findByIdAndUpdate(
          TGroupId,
          {
              groupName,
              members: allUnique.filter(member => members.some(mem => mem.userId === member.userId)),
              profilePic,
              projectLead: allUnique.filter(member => projectLead.some(lead => lead.userId === member.userId)),
              deptHead: allUnique.filter(member => deptHead.some(head => head.userId === member.userId))
          },
          { new: true }
      );

      res.json(updatedTGroup);
  } catch (error) {
      console.error("Error updating Task Group:", error);
      res.status(500).json({ error: "Internal Server Error" });
     }
});

app.put("/TGroup/:TGroupId", async (req, res) => {
  const TGroupId = req.params.TGroupId;

  const { groupName, members, profilePic, deptHead, projectLead, } = req.body;

  try {
    // Retrieve the existing task group
    const existingTGroup = await TGroupSchema.findById(TGroupId);

    if (!existingTGroup) {
      return res.status(404).json({ message: "TGroup not found" });
    }

    // Merge the existing members with the new members from the request body
    const updatedeptHeads = existingTGroup.deptHead.concat(deptHead || [])
    const updateprojectLeads = existingTGroup.projectLead.concat(projectLead || [])
    const updatedMembers = existingTGroup.members.concat(members || []);

    // Update the task group with the new data
    const updatedTGroup = await TGroupSchema.findByIdAndUpdate(
      TGroupId,
      { groupName, members: updatedMembers, profilePic, projectLead: updateprojectLeads, deptHead: updatedeptHeads },
      { new: true }
    );
    
    res.json(updatedTGroup);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/members/:TGroupId", async (req, res) => {
  const TGroupId = req.params.TGroupId;

  try {
    // Use populate to get members based on TGroupId
    const tgroup = await TGroupSchema.findOne({ _id: TGroupId }).populate({
      path: "members deptHead projectLead"
  });
    if (!tgroup) {
      return res
        .status(404)
        .json({ message: "TGroup not found for the specified TGroupId" });
    }

    const members = tgroup.members;
    const deptHead = tgroup.deptHead;
    const projectLead = tgroup.projectLead;

    res.json({members, deptHead, projectLead});
    // console.log(members,"members");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.delete("/deletegroup/:TGroupId", async (req, res) => {
  const TGroupId = req.params.TGroupId;

  console.log(`Received TGroupId: ${TGroupId}`); // Log received ID

  // Check if TGroupId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(TGroupId)) {
    console.log("Invalid Group ID"); // Log invalid ID
    return res.status(400).json({ message: "Invalid Group ID" });
  }

  try {
    const deletedTask = await TGroupSchema.findOneAndDelete({ _id: TGroupId });

    if (deletedTask) {
      console.log("Task Group deleted successfully"); // Log success
      res.status(200).json({ message: "Task Group deleted successfully" });
    } else {
      console.log("Task Group not found"); // Log not found
      res.status(404).json({ message: "Task Group not found" });
    }
  } catch (error) {
    console.error("Error deleting Task Group:", error);
    res.status(500).json({ error: "Internal Server Error" });
}
});

app.get("/tasksByGroup", async (req, res) => {
  try {
    // Aggregate tasks by group name
    const tasksByGroup = await Task.aggregate([
      {
        $group: {
          _id: "$taskGroup", // Group by taskGroup field
          totalTasks: { $sum: 1 },
          inProgressTasks: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
          completedTasks: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          cancelledTasks: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } }
        }
      }
    ]);

    res.json(tasksByGroup);
  } catch (error) {
    console.error("Error fetching tasks by group:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/allassignuser", async (req, res) => {
  try {
    // Find users with userRole equal to 3
    const specifiedUsers = await User.find({ userRole: 3 });

    // Array to store user data along with assigned task and group names
    let userData = [];

    // Iterate through specified users
    for (const user of specifiedUsers) {
      const userId = user._id;

      // Find all tasks where the specified user is assigned as a person
      const tasksForUser = await Task.find({ "people.userId": userId }).populate('taskGroup', 'taskGroup');

      // Initialize arrays to store assigned task names and group data for the user
      let taskNames = [];

      // Object to store group data
      let groupData = [];

      // Iterate through tasks assigned to the user
      for (const task of tasksForUser) {
        // Collect task names
        taskNames.push(task.taskName);

        // Get the group name
        const groupName = task.taskGroup.groupName;

        // Check if the group name already exists in groupData array
        const groupIndex = groupData.findIndex(group => group.name === groupName);

        // If the group name doesn't exist, add it to groupData array
        if (groupIndex === -1) {
          groupData.push({
            name: groupName,
            totalTasks: 1,
            inProgressTasks: task.status === "In Progress" ? 1 : 0,
            completedTasks: task.status === "Completed" ? 1 : 0,
            cancelledTasks: task.status === "Cancelled" ? 1 : 0
          });
        } else {
          // If the group name already exists, update the task counts
          groupData[groupIndex].totalTasks++;
          if (task.status === "In Progress") groupData[groupIndex].inProgressTasks++;
          else if (task.status === "Completed") groupData[groupIndex].completedTasks++;
          else if (task.status === "Cancelled") groupData[groupIndex].cancelledTasks++;
        }
      }

      

      // Calculate task counts for the user
      let totalTasks = 0;
      let inProgressTasks = 0;
      let completedTasks = 0;
      let cancelledTasks = 0;

      for (const task of tasksForUser) {
        switch (task.status) {
          case "In Progress":
            inProgressTasks++;
            break;
          case "Completed":
            completedTasks++;
            break;
          case "Cancelled":
            cancelledTasks++;
            break;
        }
        totalTasks++;
      }

      // Push user data along with assigned task names, group data, and task counts to userData array
      userData.push({
        user,
        taskNames,
        groupData,
        taskCounts: {
          total: totalTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          cancelled: cancelledTasks
        }
      });
    }

    res.json(userData);
  } catch (error) {
    console.error("Error fetching tasks assigned to the users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
app.get("/allusertask", async (req, res) => {
  try {
    // Find all users
    const allUsers = await User.find();

    // Array to store user data with task counts and group data
    let userData = [];

    // Iterate through each user
    for (const user of allUsers) {
      const userId = user._id;

      // Find all tasks where the user is included in the people array
      const tasksForUser = await Task.find({ "owner.id": userId });


      // Initialize variables to store task counts
      let totalTasks = tasksForUser.length;
      let inProgressTasks = 0;
      let completedTasks = 0;
      let cancelledTasks = 0;

      // Object to store group data
      let groupData = {};

      // Count tasks by status and group
      for (const task of tasksForUser) {
        // Count tasks by status
        switch (task.status) {
          case "In Progress":
            inProgressTasks++;
            break;
          case "Completed":
            completedTasks++;
            break;
          case "Cancelled":
            cancelledTasks++;
            break;
        }

        // Count tasks by group
        const groupName = task.taskGroup;
        groupData[groupName] = groupData[groupName] || { totalTasks: 0, inProgressTasks: 0, completedTasks: 0, cancelledTasks: 0 };
        groupData[groupName].totalTasks++;
        if (task.status === "In Progress") groupData[groupName].inProgressTasks++;
        else if (task.status === "Completed") groupData[groupName].completedTasks++;
        else if (task.status === "Cancelled") groupData[groupName].cancelledTasks++;
      }

      // Push user data with task counts and group data to userData array
      userData.push({
        user,
        groupData,
        taskCounts: {
          total: totalTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          cancelled: cancelledTasks
        }
      });
    }

    res.json(userData);
  } catch (error) {
    console.error("Error fetching tasks assigned to the users:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



app.delete("/delete/:TGroupId", LevelsRoutes, async (req, res) => {
  // console.log("del");
  const TGroupId = req.params.TGroupId;

  try {
    // Use Mongoose's findOneAndDelete to find and delete the document by ID
    const deletedTask = await TGroupSchema.findOneAndDelete({ _id: TGroupId });

    if (deletedTask) {
      res.status(200).json({ message: "Task deleted successfully" });
    } else {
      res.status(404).json({ message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
app.post("/pin/:groupId", async (req, res) => {
  const { userId } = req.body; // Get userId from request body
  try {
    const group = await TGroupSchema.findById(req.params.groupId);
    if (!group) {
      return res.status(404).send({ message: "Group not found." });
    }

    // Check if userId already exists in pinnedBy array
    const isUserPinned = group.pinnedBy.some(user => user.userId === userId);
    if (isUserPinned) {
      return res.status(400).send({ message: "User already pinned to this group." });
    }

    // If user is not already pinned, add to pinnedBy array
    group.pinnedBy.push({ userId });
    await group.save();

    res.status(200).send({ message: "Group pinned successfully.", group });
  } catch (error) {
    console.error("Error pinning group:", error); // Log the error for debugging purposes
    res.status(500).send({ message: "Error pinning group.", error }); // Send the error response with details
  }
});


app.post("/unpin/:groupId/:userId", async (req, res) => {
  const { groupId, userId } = req.params; // Get groupId and userId from params
  try {
    const group = await TGroupSchema.findById(groupId);
    if (!group) {
      return res.status(404).send({ message: "Group not found." });
    }

    const userIndex = group.pinnedBy.findIndex(user => user.userId === userId);
    if (userIndex === -1) {
      return res.status(404).send({ message: "User not found in pinned list." });
    }

    // Remove user from pinnedBy array
    group.pinnedBy.splice(userIndex, 1);
    await group.save();

    res.status(200).send({ message: "Group unpinned successfully.", group });
  } catch (error) {
    res.status(500).send({ message: "Error unpinning group.", error });
  }
});

module.exports = app;
