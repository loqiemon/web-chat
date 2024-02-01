const Messages = require("../model/messageModel");
const User = require("../model/userModel");
const Chat = require('../model/chatModel');
const {genSymKey, encryptWithPublicKey, symEncrypt, symDecrypt, verifySignature, createSignature} = require("../crypto/crypto");
const {addSegment, addBlock} = require("../routes/apiRoutes");
const axios = require("axios");
const mongoose = require('mongoose');
const Session = require("../model/sessionSchema");
require("dotenv").config();
const publicKeys = require('../crypto/publicKeys');
const {login} = require("./usersController");
const privateKeys = require('../crypto/privateKeys');



module.exports.getMyChats = async (req, res, next) => {
  try {
    const { sign } = req.body;
    const session = await Session.findOne({ _id: req.cookies.sessionId });
    const currentUser = await User.findOne({ username: session.session.username })
    // const isThisUser = verifySignature(currentUser._id.toString(), sign, currentUser.publicKey)
    //
    // if (!session || !isThisUser) {
    if (!session) {
      return res.json({success: false});
    }

    let chats = []
    if (currentUser.chats.length > 0){
      for (let chat of currentUser.chats) {
        const chatFounded = await Chat.findById({ _id: chat.chatId });
        const usersInChat = chatFounded.users.filter(us => us.toString() !== currentUser._id.toString())
        if (chat.private) {
          const otherUser = await User.findById(usersInChat[0].toString())
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
    const { chatId, sign } = req.body;

    const session = await Session.findOne({ _id: req.cookies.sessionId });
    const user = await User.findOne({ username: session.session.username });


    // const isThisUser = verifySignature(chatId, sign, user.publicKey)


    if (!session) {
      return res.json({success: false});
    }

    // if (isThisUser) {
      const chat = user.chats.find(chat => chat._id.toString() === chatId)
      if (chat) {
        return res.json({success: true, chat: chat._id, symKey: chat.encryptionKey, iv: chat.iv });
      } else {
        return res.json({success: false});
      }
    // }else {
    //   return res.json({success: false});
    // }


  }catch(ex){
    next(ex);
  }
}


module.exports.createChatIfNotExist = async (req, res, next) => {
  try {
    const { userId, sign } = req.body;
    const session = await Session.findOne({ _id: req.cookies.sessionId });

    const currentUser = await User.findOne({ username: session.session.username });
    // const isThisUser = verifySignature(currentUser._id, sign, currentUser.publicKey)

    // if (!session || !isThisUser) {
      if (!session) {
      return res.json({success: false});
    }


    const otherUser = await User.findById(userId);

    const chatObjectId = new mongoose.Types.ObjectId(userId);
    let isExist = await Chat.find({private:true, users:[currentUser._id, chatObjectId ]})
    isExist.length < 1 ? isExist = await Chat.find({private:true, users:[chatObjectId, currentUser._id ]}) : {}

    if (isExist.length < 1) {
      const newChat = await Chat.create({
        users: [currentUser._id, otherUser._id],
        private: true
      });
      const chatSymKey = genSymKey()
      const currentUserKey = encryptWithPublicKey(currentUser.publicKey, chatSymKey)
      currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, chatname: otherUser.nickname, avatarImage: otherUser.avatarImage, private: true });
      const otherUserKey = encryptWithPublicKey(otherUser.publicKey, chatSymKey)
      otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, chatname: currentUser.nickname, avatarImage: currentUser.avatarImage, private: true});


      await currentUser.save();
      await otherUser.save();

      const resp = await axios.post(addSegment, {
        "segment_id": newChat._id
      }).then(res => {
        console.log(res)
      }).catch(res => console.log(res))
      return res.json({ success: true, chatId: newChat._id, chatSymKey: currentUserKey});
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
    next(ex);
  }
}


module.exports.saveChats = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.cookies.sessionId });
    if (!session) {
      return res.json({success: false});
    }
    const user = await User.findOne({ username: session.session.username })
    user.chats.forEach(chat => {
      axios.post(addBlock, {segment_id: chat.chatId})
    })
    return res.json({ success: true})
  } catch (ex) {
    next(ex);
  }
}


module.exports.createCommonChat = async (req, res, next) => {
  try {
    const {userIds, chatName} = req.body;
    const chatname = chatName.length > 3 ? chatName : "Беседа"
    const session = await Session.findOne({_id: req.cookies.sessionId});


    if (!session || userIds.length < 1 || chatName < 1) {
      return res.json({success: false});
    }

    const currentUser = await User.findOne({username: session.session.username});

    const newChat = await Chat.create({
      users: [currentUser._id, ...userIds],
      private: false,
      chatname: "Чат "+chatname
    });
    const chatSymKey = genSymKey()

    const currentUserKey = encryptWithPublicKey(currentUser.publicKey, chatSymKey)
    currentUser.chats.push({
      chatId: newChat._id,
      encryptionKey: currentUserKey,
      chatname: "Чат "+chatname,
      private: false
    });
    await currentUser.save();

    for (userid of userIds){
      const otherUser = await User.findById(userid);
      const otherUserKey = encryptWithPublicKey(otherUser.publicKey, chatSymKey)
      otherUser.chats.push({
        chatId: newChat._id,
        encryptionKey: otherUserKey,
        chatname: "Чат "+chatname,
        private: false
      });
      await otherUser.save();
    }

    const resp = await axios.post(addSegment, {
        "segment_id": newChat._id
      }).then(res => {
        // console.log(res.st)
      }).catch(res => console.log(res))
      return res.json({success: true});
  } catch (ex) {
    next(ex);
  }
}