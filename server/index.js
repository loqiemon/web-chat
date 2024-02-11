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
const fs = require('fs');
const path = require('path');


const app = express();
require("dotenv").config();


app.use(cors({ credentials: true, origin: process.env.ORIGIN }));


app.use(express.json())
app.use(cookieParser(process.env.COOKIE_SECRET_KEY));

// const folderPath = path.join(__dirname, 'static')

// app.use(express.static(folderPath));

app.get('/static/:folder/:filename', (req, res) => {
    const fileName = req.params.filename;
    const folderPath = path.join(__dirname, 'static', req.params.folder);
    const filePath = path.join(folderPath, fileName);
    res.download(filePath, (err) => {
        if (err) {
            console.error('Ошибка при скачивании файла:', err);
            res.status(404).send('Файл не найден');
        }
    });

});


const multer = require('multer');
const upload = multer(); // без параметров, чтобы разрешить загрузку файлов

app.post('/addFile', upload.single('file'), async (req, res, next) => {
    try {
        console.log(req.body, 'file')
        console.log("req.file", req.file)

        const file = req.file; // Здесь будет объект файла
        const data = req.body;

        const fullPath = path.join(__dirname, 'static', data.filePath);
        fs.mkdirSync(fullPath, { recursive: true });

        fs.writeFile(fullPath + '/' + file.originalname, file.buffer, (err) => {
            if (err) {
                console.error('Error writing file:', err);
                return res.status(500).json({ success: false, error: err.message });
            } else {
                console.log('File saved successfully.');
                return res.json({ success: true });
            }
        });
    } catch (ex) {
        next(ex);
    }
});


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
        console.log('chatId', chatId)
        socket.join(chatId)
    })

    socket.on('disconnect-from-chat', async (chatId) => {
        if (chatId){
            console.log('disconnet', chatId)
            axios.post(addBlock, {segment_id: chatId, block: null})
            socket.leave(chatId)
        }
    })

      socket.on('update-chats', async (users) => {
          if (users.length > 0){
              for (let userId of users) {
                  const socketId = onlineUsers.get(userId)
                  socket.to(socketId).emit('update-chats')
              }
          }
      })

  socket.on("send-msg", (data) => {
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