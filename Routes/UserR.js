const express = require("express");
const bcrypt = require("bcrypt");
const multer = require("multer");
const UserSchema = require("../modules/UserSchema");

const Router = express.Router();
let io;

const initializeSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
    const user = await UserSchema.findByIdAndUpdate(userId, { active: false }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    io.emit("user-deactivated", user);
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

Router.put("/users/:userId/activate", async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await UserSchema.findByIdAndUpdate(userId, { active: true }, { new: true });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

Router.get("/user/:userId", async (req, res) => {
  const userId = req.params.userId;
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

module.exports = { app: Router, initializeSocketIo };
