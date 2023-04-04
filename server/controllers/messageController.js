const Messages = require("../model/messageModel");
const User = require("../model/userModel");
const Chat = require('../model/chatModel');
const {genSymKey, encryptWithPublicKey} = require("../crypto/crypto");
const {addSegment} = require("../routes/apiRoutes");
const axios = require("axios");
const mongoose = require('mongoose');
const Session = require("../model/sessionSchema");

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


    let chats = []
    if (currentUser.chats.length > 0){
      currentUser.chats.forEach(chat => {
        if (chat.private) {
          console.log('private')
          const otherUser = chat.users.find(user => user._id !== currentUser._id)
          chats.push({
            _id: chat._id,
            avatarImage: otherUser.avatarImage,
            chatname: otherUser.nickname,
            lastActivity: chat.lastActivity
          })
        }else {
          chats.push({
            _id: chat._id,
            avatarImage: chat.avatarImage,
            chatname: chat.chatname,
            lastActivity: chat.lastActivity
          })
        }
      })
      console.log(chats, 'chats')
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

    const chat = user.chats.find(chat => chat._id.toString() === chatId)
    console.log(chat)
    if (chat) {
      return res.json({success: true, chat: chat._id, symKey: chat.encryptionKey, iv: chat.iv });
    } else {
      return res.json({success: false});
    }
  }catch(ex){
    next(ex);
  }
}


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

      const currentUserIv = encryptWithPublicKey(currentUser.publicKey, chatSymKey.key)
      const currentUserKey = encryptWithPublicKey(currentUser.publicKey, chatSymKey.iv)
      console.log(currentUserIv, currentUserKey)
      currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, iv: currentUserIv, chatname: otherUser.nickname, avatarImage: otherUser.avatarImage });

      const otherUserIv = encryptWithPublicKey(otherUser.publicKey, chatSymKey.key)
      const otherUserKey = encryptWithPublicKey(otherUser.publicKey, chatSymKey.iv)
      otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, iv: otherUserIv, chatname: currentUser.nickname, avatarImage: currentUser.avatarImage });

      console.log(2)
      await currentUser.save();
      await otherUser.save();

      console.log(3)
      const resp = await axios.post(addSegment, {
        "segment_id": newChat._id
      }).then(res => {
        // console.log(res.st)
      }).catch(res => console.log(res))

      return res.json({ chat: newChat._id, symKey: chatSymKey.key, iv: chatSymKey.iv });
    }

    return res.json({ chat: chat._id, symKey: chat.encryptionKey, iv: chat.iv });
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
    const currentUser = await User.findOne({ username: session.session.username });
    const otherUser = await User.findById(userId);

    const chatObjectId = new mongoose.Types.ObjectId(userId);
    console.log(chatObjectId, currentUser._id)
    let isExist = await Chat.find({private:true, users:[currentUser._id, chatObjectId ]})
    isExist.length < 1 ? isExist = await Chat.find({private:true, users:[chatObjectId, currentUser._id ]}) : {}

    if (isExist.length < 1) {
      const newChat = await Chat.create({
        users: [currentUser._id, otherUser._id],
        private: true
      });

      const chatSymKey = genSymKey()

      const currentUserIv = encryptWithPublicKey(currentUser.publicKey, chatSymKey.key)
      const currentUserKey = encryptWithPublicKey(currentUser.publicKey, chatSymKey.iv)
      console.log(currentUserIv, currentUserKey)
      currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, iv: currentUserIv, chatname: otherUser.nickname, avatarImage: otherUser.avatarImage });

      const otherUserIv = encryptWithPublicKey(otherUser.publicKey, chatSymKey.key)
      const otherUserKey = encryptWithPublicKey(otherUser.publicKey, chatSymKey.iv)
      otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, iv: otherUserIv, chatname: currentUser.nickname, avatarImage: currentUser.avatarImage });

      console.log(2)
      await currentUser.save();
      await otherUser.save();

      console.log(3)
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
    return res.json({ success: false})
    next(ex);
  }


}


