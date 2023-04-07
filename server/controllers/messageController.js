const Messages = require("../model/messageModel");
const User = require("../model/userModel");
const Chat = require('../model/chatModel');
const {genSymKey, encryptWithPublicKey, symEncrypt, symDecrypt} = require("../crypto/crypto");
const {addSegment} = require("../routes/apiRoutes");
const axios = require("axios");
const mongoose = require('mongoose');
const Session = require("../model/sessionSchema");
require("dotenv").config();
const publicKeys = require('../crypto/publicKeys');
const {login} = require("./usersController");


module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      return {
        fromSelf: msg.sender.toString() === from,
        message: msg.message.text,
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;
    const data = await Messages.create({
      message: { text: message },
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Сообщение отправлено" });
    else return res.json({ msg: "Ошибка при добавлении сообщения в бд" });
  } catch (ex) {
    next(ex);
  }
};




module.exports.getMyChats = async (req, res, next) => {
  try {
    // const {from} = req.body;
    // const currentUser = await User.findById(from);
    const session = await Session.findOne({ _id: req.cookies.sessionId });
    const currentUser = await User.findOne({ username: session.session.username })

    if (!session) {
      return res.json({success: false});
    }

    let chats = []
    if (currentUser.chats.length > 0){
      for (let chat of currentUser.chats) {
        const chatFounded = await Chat.findById({ _id: chat.chatId });
        const usersInChat = chatFounded.users.filter(us => us.toString() !== currentUser._id.toString())
        if (chat.private) {
          console.log('private')
          console.log(usersInChat)
          // const otherUser = chat.users.find(user => user._id !== currentUser._id)
          const otherUser = await User.findById(usersInChat[0].toString())
          console.log(otherUser, 'otherUser')
          chats.push({
            _id: chat._id,
            chatId: chat.chatId,
            avatarImage: otherUser.avatarImage,
            chatname: otherUser.nickname,
            lastActivity: new Date(chatFounded.lastActivity),
            users: usersInChat
          })
        }else {
          chats.push({
            _id: chat._id,
            chatId: chat.chatId,
            avatarImage: chat.avatarImage,
            chatname: chat.chatname,
            lastActivity: new Date(chatFounded.lastActivity),
            users: usersInChat
          })
        }
      }
      // console.log(chats, 'chats')
      chats.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

      chats.forEach(item => {
        // const day = item.lastActivity.getDate().toString().padStart(2, '0');
        // const month = (item.lastActivity.getMonth() + 1).toString().padStart(2, '0');
        // item.lastActivity = `${day}.${month}`;
        const hours = item.lastActivity.getHours().toString().padStart(2, '0');
        const minutes = item.lastActivity.getMinutes().toString().padStart(2, '0');
        item.lastActivity = `${hours}:${minutes}`;
      });

      return res.json({ data: chats });
    }else {
      return res.json({ data: [] });
    }
  } catch (ex) {
    next(ex);
  }
};


module.exports.getChatData = async (req, res, next) => {
  try {
    const { chatId } = req.body;
    const session = await Session.findOne({ _id: req.cookies.sessionId });
    const user = await User.findOne({ username: session.session.username });

    if (!session) {
      return res.json({success: false});
    }

    const chat = user.chats.find(chat => chat._id.toString() === chatId)
    console.log(chat)
    // const decryptedKey = symDecrypt(chat.encryptionKey, process.env.CHAT_SYM_KEY,process.env.CHAT_SYM_IV)
    // const decryptedIv = symDecrypt(chat.iv, process.env.CHAT_SYM_KEY,process.env.CHAT_SYM_IV)
    console.log(chat.encryptionKey, chat.iv, 'encr')
    if (chat) {
      return res.json({success: true, chat: chat._id, symKey: chat.encryptionKey, iv: chat.iv });
    } else {
      return res.json({success: false});
    }
  }catch(ex){
    next(ex);
  }
}

//not used
module.exports.getChatMessages = async (req, res, next) => {
  try {
    const { userId, chatId, privateChat } = req.body;

    const currentUser = await User.findById(userId);
    const chatObjectId = new mongoose.Types.ObjectId(chatId);

    const chat = currentUser.chats.find(chat => {
      console.log(chat._id, 'chat._id')
      console.log(chatObjectId, 'chatId')
      chat._id == chatObjectId
    })
    console.log(chat, 'chat')

    if (!chat){
      const otherUser = await User.findById(chatId);

      const newChat = await Chat.create({
          users: [userId, otherUser._id],
          private: true
      });

      const chatSymKey = genSymKey()

      const currentUserKey = encryptWithPublicKey(currentUser.publicKey, chatSymKey)
      // const currentUserIv = encryptWithPublicKey(currentUser.publicKey, chatSymKey.iv)
      // console.log(currentUserIv, currentUserKey)
      // currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, iv: currentUserIv, chatname: otherUser.nickname, avatarImage: otherUser.avatarImage });
      currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, chatname: otherUser.nickname, avatarImage: otherUser.avatarImage });

      const otherUserKey = encryptWithPublicKey(otherUser.publicKey, chatSymKey)
      // const otherUserIv = encryptWithPublicKey(otherUser.publicKey, chatSymKey.iv)
      // otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, iv: otherUserIv, chatname: currentUser.nickname, avatarImage: currentUser.avatarImage });
      otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, chatname: currentUser.nickname, avatarImage: currentUser.avatarImage });

      console.log(2)
      await currentUser.save();
      await otherUser.save();

      console.log(3)
      const resp = await axios.post(addSegment, {
        "segment_id": newChat._id
      }).then(res => {
        // console.log(res.st)
      }).catch(res => console.log(res))

      // return res.json({ chat: newChat._id, symKey: chatSymKey.key, iv: chatSymKey.iv });
      return res.json({ chat: newChat._id, symKey: chatSymKey.key });
    }

    return res.json({ chat: chat._id, symKey: chat.encryptionKey });
    // return res.json({ chat: chat._id, symKey: chat.encryptionKey, iv: chat.iv });
  }catch (ex) {
    next(ex);
  }
};


  // try {
  //   const { from, to } = req.body;
  //   const currentUser = await User.findById(from).populate('chats.chatId');
  //
  //   const personalChats = currentUser.chats.filter((chat) => {
  //     const users = chat.chatId.users.map((user) => user.toString());
  //     return users.length === 2;
  //   }).map((chat) => chat.chatId);
  //
  //   const chatExists = personalChats.some((chat) => {
  //     const users = chat.users.map((user) => user.toString());
  //     return users.includes(to.toString());
  //   });
  //
  //   if (!chatExists) {
  //     const newChat = await Chat.create({
  //       chatname: '',
  //       users: [from, to],
  //       private: true
  //     });
  //     console.log(1)
  //
  //     const chatSymKey = genSymKey()
  //
  //     const currentUserIv = encryptWithPublicKey(currentUser.publicKey, chatSymKey.key)
  //     const currentUserKey = encryptWithPublicKey(currentUser.publicKey, chatSymKey.iv)
  //     console.log(currentUserIv, currentUserKey)
  //     currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, iv: currentUserIv });
  //
  //
  //     const otherUser = await User.findById(to);
  //     const otherUserIv = encryptWithPublicKey(otherUser.publicKey, chatSymKey.key)
  //     const otherUserKey = encryptWithPublicKey(otherUser.publicKey, chatSymKey.iv)
  //     otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, iv: otherUserIv});
  //
  //     console.log(2)
  //     await currentUser.save();
  //     await otherUser.save();
  //
  //     console.log(3)
  //     const resp = await axios.post(addSegment, {
  //       "segment_id": newChat._id
  //     }).then(res => {
  //       console.log(res)
  //     }).catch(res => console.log(res))
  //   }
  //
  //   return res.json({ data: currentUser.chats });
  // } catch (ex) {
  //   next(ex);
  // }
module.exports.createChatIfNotExist = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const session = await Session.findOne({ _id: req.cookies.sessionId });

    if (!session) {
      return res.json({success: false});
    }

    const currentUser = await User.findOne({ username: session.session.username });
    const otherUser = await User.findById(userId);

    const chatObjectId = new mongoose.Types.ObjectId(userId);
    console.log(chatObjectId, currentUser._id)
    let isExist = await Chat.find({private:true, users:[currentUser._id, chatObjectId ]})
    isExist.length < 1 ? isExist = await Chat.find({private:true, users:[chatObjectId, currentUser._id ]}) : {}

    if (isExist.length < 1) {
      console.log('NEw chat 111111111111122222222222222')
      const newChat = await Chat.create({
        users: [currentUser._id, otherUser._id],
        private: true
      });

      const chatSymKey = genSymKey()
      // console.log(chatSymKey.key)
      // console.log(chatSymKey.iv)
      console.log(chatSymKey.key, 'before')
      // const currentUserIv = encryptWithPublicKey(currentUser.publicKey, chatSymKey.iv )
      const currentUserKey = encryptWithPublicKey(currentUser.publicKey, chatSymKey)
      console.log(currentUserKey, 'after')
      // console.log(currentUserIv, currentUserKey, 'current')
      // const encryptedCurrentUserIv = symEncrypt(currentUserIv, process.env.CHAT_SYM_KEY, process.env.CHAT_SYM_IV)
      // const encryptedCurrentUserKey = symEncrypt(currentUserKey, process.env.CHAT_SYM_KEY, process.env.CHAT_SYM_IV)
      // console.log(encryptedCurrentUserIv, encryptedCurrentUserKey)
      // currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, iv: currentUserIv, chatname: otherUser.nickname, avatarImage: otherUser.avatarImage, private: true });
      currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, chatname: otherUser.nickname, avatarImage: otherUser.avatarImage, private: true });


      // const otherUserIv = encryptWithPublicKey(otherUser.publicKey, chatSymKey.iv)
      const otherUserKey = encryptWithPublicKey(otherUser.publicKey, chatSymKey)
      // const encryptedOtherUserIv = symEncrypt(otherUserIv, process.env.CHAT_SYM_KEY, process.env.CHAT_SYM_IV)
      // const encryptedOtherUserKey = symEncrypt(otherUserKey, process.env.CHAT_SYM_KEY, process.env.CHAT_SYM_IV)
      // otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, iv: otherUserIv, chatname: currentUser.nickname, avatarImage: currentUser.avatarImage, private: true});
      otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, chatname: currentUser.nickname, avatarImage: currentUser.avatarImage, private: true});


      await currentUser.save();
      await otherUser.save();

      const resp = await axios.post(addSegment, {
        "segment_id": newChat._id
      }).then(res => {
        // console.log(res.st)
      }).catch(res => console.log(res))
      return res.json({ success: true });
    }else {
      return res.json({ alreadyExist: true, success: true });
    }

  }catch (ex) {
    next(ex);
  }


}

module.exports.updateChat = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.cookies.sessionId });
    if (!session) {
      return res.json({success: false});
    }
    const {chatId} = req.body;
    console.log(chatId)
    const chat = await Chat.findByIdAndUpdate(chatId, {lastActivity: Date.now()})
    console.log(chat)
    return res.json({ success: true})
  } catch (ex) {
    return res.json({success: false})
    next(ex);
  }
}



