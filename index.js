const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const UserR = require('./Routes/UserR');
const Signinroutes = require('./Routes/Signinroutes');
const AddTask = require('./Routes/AddTask');
const TaskGroup = require('./Routes/Tasks');
const TGroupR = require('./Routes/TGroupR');
const ForgetPassword = require('./Routes/Forgotpassword');
const cors = require('cors');
const ResetPassword = require('./Routes/Resetpassword');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const PORT = 5000;

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect('mongodb+srv://Promise:Promise@cluster0.iufeasi.mongodb.net/?retryWrites=true&w=majority')
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
const { app: taskRoutes, initializeSocketIo } = require('./Routes/AddTask');
initializeSocketIo(io);
const { app: taskGroupRoutes, initializeSocketIo: initializeTaskGroupSocketIo } = require('./Routes/Tasks');
initializeTaskGroupSocketIo(io);

// Use routes and pass the Socket.io instance
app.use('/api', UserR);
app.use('/api', Signinroutes);
app.use('/api', taskRoutes);  // Pass the Socket.io instance
app.use('/api', taskGroupRoutes);
app.use('/api', TGroupR);
app.use('/api', ForgetPassword);
app.use('/api', ResetPassword);

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
