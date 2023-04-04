const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const messageRoute = require('./routes/messagesRoute');
const socket = require("socket.io");
const cookieParser = require('cookie-parser');


const app = express();
require("dotenv").config();


app.use(cors({ credentials: true, origin: process.env.ORIGIN }));


app.use(express.json())
app.use(cookieParser(process.env.COOKIE_SECRET_KEY));


app.use('/api/auth', userRoutes)
app.use('/api/messages', messageRoute)
const getSession = async (sessionId) => {
    try {
        const session = await Session.findOne({ sessionId });
        return session ? session.sessionData : null;
    } catch (error) {
        console.log(error);
        return null;
    }
};


app.use(async (req, res, next) => {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
        const sessionData = await getSession(sessionId);
        if (sessionData) {
            req.session = sessionData;
        }
    }
    next();
});



mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then((e) => {
    console.log('DB connected')
}).catch((err) => {
    console.log(err.message)
})


const server = app.listen(process.env.PORT, () => {
    console.log(`Server started on ${process.env.PORT}`)
})


const io = socket(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  global.onlineUsers = new Map();
  io.on("connection", (socket) => {
    global.chatSocket = socket;
    socket.on("add-user", (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    socket.on("send-msg", (data) => {
      const sendUserSocket = onlineUsers.get(data.to);
      if (sendUserSocket) {
        socket.to(sendUserSocket).emit("msg-recieve", data.msg);
      }
    });
  });