const Messages = require("../model/messageModel");
const User = require("../model/userModel");
const Chat = require('../model/chatModel');
const {genSymKey, encryptWithPublicKey} = require("../crypto/crypto");
const {addSegment} = require("../routes/apiRoutes");
const axios = require("axios");

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
    const {from} = req.body;
    const _id = from;
    const currentUser = await User.findById(_id);
    console.log(currentUser)
    return res.json({ data: currentUser.chats });
  } catch (ex) {
    next(ex);
  }
};


module.exports.checkIfChatExist = async (req, res, next) => {
  try {
    const { from, to } = req.body;
    const currentUser = await User.findById(from).populate('chats.chatId');

    const personalChats = currentUser.chats.filter((chat) => {
      const users = chat.chatId.users.map((user) => user.toString());
      return users.length === 2;
    }).map((chat) => chat.chatId);

    const chatExists = personalChats.some((chat) => {
      const users = chat.users.map((user) => user.toString());
      return users.includes(to.toString());
    });

    if (!chatExists) {
      const newChat = await Chat.create({
        chatname: '',
        users: [from, to],
        private: true
      });
      console.log(1)

      const chatSymKey = genSymKey()

      const currentUserIv = encryptWithPublicKey(currentUser.publicKey, chatSymKey.key)
      const currentUserKey = encryptWithPublicKey(currentUser.publicKey, chatSymKey.iv)
      console.log(currentUserIv, currentUserKey)
      currentUser.chats.push({ chatId: newChat._id , encryptionKey: currentUserKey, iv: currentUserIv });


      const otherUser = await User.findById(to);
      const otherUserIv = encryptWithPublicKey(otherUser.publicKey, chatSymKey.key)
      const otherUserKey = encryptWithPublicKey(otherUser.publicKey, chatSymKey.iv)
      otherUser.chats.push({ chatId: newChat._id , encryptionKey: otherUserKey, iv: otherUserIv});

      console.log(2)
      await currentUser.save();
      await otherUser.save();

      console.log(3)
      const resp = await axios.post(addSegment, {
        "segment_id": newChat._id
      }).then(res => {
        console.log(res)
      }).catch(res => console.log(res))
    }

    return res.json({ data: currentUser.chats });
  } catch (ex) {
    next(ex);
  }
};


