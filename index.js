const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const UserR = require('./Routes/UserR');
const Signinroutes = require('./Routes/Signinroutes');
const AddTask = require('./Routes/AddTask');
const TaskGroup = require('./Routes/Tasks');
const TGroupR = require('./Routes/TGroupR');
const ForgetPassword = require('./Routes/Forgotpassword');
const ResetPassword = require('./Routes/Resetpassword');
const SubTask = require('./Routes/SubTask');
const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected successfully'))
  .catch(err => console.error('Failed connection', err));

// Create HTTP server and integrate Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Use routes and pass the Socket.io instance
const { initializeSocketIo: initializeAddTaskSocketIo } = require('./Routes/AddTask');
const { initializeSocketIo: initializeTaskGroupSocketIo } = require('./Routes/Tasks');
const { initializeSocketIo: initializeUserSocketIo } = require('./Routes/UserR');

initializeAddTaskSocketIo(io);
initializeTaskGroupSocketIo(io);
initializeUserSocketIo(io);

app.use('/api', UserR.app);
app.use('/api', Signinroutes);
app.use('/api', AddTask.app);
app.use('/api', TaskGroup.app);
app.use('/api', TGroupR);
app.use('/api', ForgetPassword);
app.use('/api', ResetPassword);
app.use('/api', SubTask);

// Socket.io connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('chat message', (msg) => {
    console.log('Message received:', msg);
    io.emit('chat message', msg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
