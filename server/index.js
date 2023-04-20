const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const messageRoute = require('./routes/messagesRoute');
const socket = require("socket.io");
const cookieParser = require('cookie-parser');
const {addBlock} = require("./routes/apiRoutes");
const axios = require("axios");
const User = require('./model/userModel')


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
      origin: process.env.ORIGIN,
      credentials: true,
    },
  });

  global.onlineUsers = new Map();
  io.on("connection", (socket) => {
    global.chatSocket = socket;
    socket.on("add-user", (userId) => {
      onlineUsers.set(userId, socket.id);
    });

    socket.on('connect-to-chat', async (chatId) => {
        socket.join(chatId)
    })

    socket.on('disconnect-from-chat', async (chatId) => {
        if (chatId){
            console.log('disconnet', chatId)
            axios.post(addBlock, {segment_id: chatId, block: null})
            socket.leave(chatId)
        }
    })

  socket.on('update-chats', async (users, chatId) => {
      if (users.length > 0){
          for (let userId of users) {
              const socketId = onlineUsers.get(userId)
              console.log('update')
              socket.to(socketId).emit('update-chats', chatId)
          }
      }
  })

  socket.on("send-msg", (data) => {
      console.log(1)
      socket.to(data.to).emit('msg-receive', data.message);
  })



  socket.on('disconnect', async () => {
      for (let [userId, socketId] of onlineUsers.entries()) {
          if (socketId === socket.id) {
              const user = await User.findById(userId)
              user.chats.forEach(chat => {
                  axios.post(addBlock, {segment_id: chat.chatId, block: null})
              })

              onlineUsers.delete(userId);
              console.log(`User with id ${userId} disconnected`);
              break;
          }
      }
  });
  //
  //   socket.on("send-msg", (data) => {
  //     const sendUserSocket = onlineUsers.get(data.to);
  //     if (sendUserSocket) {
  //       socket.to(sendUserSocket).emit("msg-recieve", data.msg);
  //     }
  //   });
  });