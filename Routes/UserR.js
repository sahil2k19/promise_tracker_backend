const express = require("express");
const bcrypt = require("bcrypt");
const multer = require('multer');
const mongoose = require("mongoose");
const UserSchema = require("../modules/UserSchema");
const upload = require("../services/s3");
const Router = express.Router();
let io;

const initializeSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};





Router.post("/registration", async (req, res) => {
  const { name, mobilenumber, email, password, userRole, active } = req.body;
  try {
    const existinguser = await UserSchema.findOne({ email });
    if (existinguser) {
      return res.status(400).json({ message: "Already registered" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newRegister = new UserSchema({
      name,
      mobilenumber,
      email,
      password: hashedPassword,
      userRole,
      active,
    });
    await newRegister.save();
    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

Router.post('/bulk-upload', async (req, res) => {
  try {
      const users = req.body; // Data received from frontend

      if (!Array.isArray(users) || users.length === 0) {
          return res.status(400).json({ message: 'No data provided' });
      }

      // Process each user
      for (const user of users) {
          if (!user.email || !user.password) {
              return res.status(400).json({ message: 'Invalid data for user' });
          }

          // Check if user already exists
          const existingUser = await UserSchema.findOne({ email: user.email });
          if (existingUser) {
              return res.status(400).json({ message: `User with email ${user.email} already exists` });
          }

          // Hash the password
          if (typeof user.password === 'number') {
              user.password = user.password.toString(); // Convert to string if necessary
          }
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
      }

      // Save users to the database
      await UserSchema.insertMany(users);

      res.status(201).json({ message: 'Users uploaded successfully!' });
  } catch (error) {
      console.error('Error during bulk upload:', error);
      res.status(500).json({ message: 'Failed to upload users' });
  }
});
Router.get('/users-by-role/:role', async (req, res) => {
  const { role } = req.params;
  try {
    const users = await UserSchema.find({ userRole: role });
    if (users.length === 0) {
      return res.status(404).json({ message: `No users found with role ${role}` });
    }
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users by role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

Router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
      // Check if ID is valid
      if (!id) {
          return res.status(400).json({ message: 'User ID is required' });
      }

      // Find and delete the user by ID
      const user = await UserSchema.findByIdAndDelete(id);

      // Check if user was found and deleted
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
  }
});


Router.put("/users/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    const user = await UserSchema.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    Object.keys(req.body).forEach(key => {
      user[key] = req.body[key];
    });
    io.emit(`user_update${user._id}`, user);

    await user.save();
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

Router.put("/users/:userId/deactivate", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await UserSchema.findByIdAndUpdate(userId, { active: false, userRole: 5 }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    io.emit(`user_update${user._id}`, user);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

Router.put("/users/:userId/activate", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await UserSchema.findByIdAndUpdate(userId, { active: true, userRole: 5 }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    io.emit(`user_update${user._id}`, user);

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

Router.get("/user/:userId", async (req, res) => {
  const userId = req.params.userId;

  // Validate the userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID format" });
  }

  try {
    const user = await UserSchema.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

Router.get("/userData", async (req, res) => {
  try {
    const UserData = await UserSchema.find();
    const allUserData = UserData.map(item => ({
      userId: item._id,
      name: item.name,
      email: item.email,
      userRole: item.userRole,
      active: item.active,
    }));
    res.json(allUserData);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

Router.get("/registeredNames", async (req, res) => {
  try {
    const getData = await UserSchema.find();
    const userNamesEmail = getData.map(item => ({
      userId: item._id,
      name: item.name,
      email: item.email,
      active: item.active,
      userRole: item.userRole,
      profilePic: item.profilePic,
    }));
    res.json(userNamesEmail);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

Router.put("/updateUserRole/:id", async (req, res) => {
  const { id } = req.params;
  const { userRole } = req.body;
  if (!userRole) {
    return res.status(400).send("userRole is required.");
  }
  try {
    const updatedUser = await UserSchema.findByIdAndUpdate(id, { userRole }, { new: true });
    if (!updatedUser) {
      return res.status(404).send("The user with the given ID was not found.");
    }
    io.emit(`user_update${updatedUser._id}`, updatedUser);

    res.send(updatedUser);
  } catch (error) {
    res.status(500).send("Something went wrong");
  }
});

Router.delete("/users/:id", async (req, res) => {
  try {
    const user = await UserSchema.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    res.send({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).send({ message: "Server error", error: error.message });
  }
});


// upload image in s3 bucket
Router.put('/change-proifle-pic/:userId', upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.params
    const user = await UserSchema.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    user.profilePic = req.file.location;
    await user.save();
    res.send({ result: req.file.location, message: "Profile pic updated successfully" });
  } catch (error) {
    res.status(500).send({ message: "Server error", error: error.message });
  }
})

Router.post('/upload-image', upload.single('image'), async (req, res) => {

  try {
    const imageUrl = req.file.location
    res.json({ result: imageUrl, message: "image uploaded successfully" })
  } catch (err) {
    res.json(err)
  }
})
Router.post('/upload-file', upload.single('file'), async (req, res) => {

  try {
    const fileUrl = req.file.location
    res.json({ result: fileUrl, message: "file uploaded successfully" })
  } catch (err) {
    res.json(err)
  }
})
//   for multiple images
Router.post('/upload-multiple-images', upload.array('images'), async (req, res) => {
  try {
    const imageUrls = req.files.map(file => file.location);
    res.json({ result: imageUrls, message: "Images uploaded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// for voices
Router.post('/upload-voice', upload.single('voice'), async (req, res) => {
  try {
    const voiceUrl = req.file.location;
    res.json({ result: voiceUrl, message: "Voice file uploaded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// for multiple voices
Router.post('/upload-multiple-voices', upload.array('voices'), async (req, res) => {
  try {
    const voiceUrls = req.files.map(file => file.location);
    res.json({ result: voiceUrls, message: "Voice files uploaded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { app: Router, initializeSocketIo };
