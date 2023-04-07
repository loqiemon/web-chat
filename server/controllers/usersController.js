const User = require('../model/userModel')
const bcrypt = require('bcrypt')
const Messages = require("../model/messageModel");
const Chat = require("../model/chatModel");
const Session = require("../model/sessionSchema");
const crypto = require('crypto');
const {genAsymKey, symEncrypt, encryptWithPassword, decryptWithPassword, encryptWithPublicKey, genSymKey} = require("../crypto/crypto");
const publicKeys = require('../crypto/publicKeys');
const privateKeys = require('../crypto/privateKeys');
const axios = require("axios");
const {addBlock} = require("../routes/apiRoutes");


module.exports.register = async (req, res, next) => {
    try{
        const {password, username, email, nickname} = req.body;

        const usernameCheck = await User.findOne({ username })
        if (usernameCheck) {
            return res.json({msg: 'Логин занят', status: false})
        }

        const { publicKey, privateKey } = genAsymKey()

        const hashedPassword = await bcrypt.hash(password, 10)

        const encryptedPrivateKey = encryptWithPassword(privateKey, password)
        console.log(privateKey, 'before', encryptedPrivateKey, 'after')
        const user  = await User.create({
            email, username, password: hashedPassword, nickname, publicKey, privateKey: encryptedPrivateKey
        });


        privateKeys.addKey({userId: user._id.toString(), privateKey: privateKey})


        //sess
        const session = new Session({ session: { username } });
        await session.save();
        const sessionId = session._id.toString();
        // console.log(sessionId, 'sess sessionId')
        // res.cookie('sessionId', sessionId, { maxAge: 86400000, httpOnly: true });
        // res.cookie('sessio', sessionId);
        // console.log(user)
        // return res.json({status: true, avatar: user.avatarImage})

        res.cookie('sessionId', sessionId, {
            // expires: new Date(Date.now() + 900000),
            httpOnly: true,
            // httpOnly: false,
            secure: true,
            sameSite: "None",
            // sameSite: true,
            // sameSite: false,
            // maxAge: 2 * 60 * 1000,
            maxAge: 24 * 60 * 60 * 1000,
            domain: 'localhost',
            path: '/',
            // secure: false //  true for HTTPS
        });

        return res.status(200).json({ status: true, avatar: user.avatarImage });
    }catch(ex) {
        next(ex)
    }
} 

module.exports.login = async (req, res, next) => {
    try{
        const {password, username} = req.body;
        console.log(password)
        const user = await User.findOne({ username})
        if (!user) {
            return res.json({msg: 'Неверный логин или пароль', status: false})
        }
        // const hashedPassword = await bcrypt.hash(password, 10)
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid){
            return res.json({msg: 'Неверный логин или пароль', status: false})
        }

        const decryptedPrivateKey = decryptWithPassword(user.privateKey, password)
        privateKeys.addKey({userId: user._id.toString(), privateKey: decryptedPrivateKey})

        const session = new Session({ session: { username } });
        await session.save();
        const sessionId = session._id.toString();
        console.log(sessionId, 'sess sessionId')
        // res.cookie('sessionId', sessionId, { expires: new Date(Date.now() + 900000), maxAge: 86400000, httpOnly: true });
        // return res.json({status: true, avatar: user.avatarImage})
        // res.cookie('sessionId', sessionId, { expires: new Date(Date.now() + 900000), maxAge: 86400000, httpOnly: true  });
        res.cookie('sessionId', sessionId, {
            // expires: new Date(Date.now() + 900000),
            httpOnly: true,
            // httpOnly: false,
            secure: true,
            sameSite: "None",
            // sameSite: true,
            // sameSite: false,
            // maxAge: 2 * 60 * 1000,
            maxAge: 24 * 60 * 60 * 1000,
            domain: 'localhost',
            path: '/',
            // secure: false //  true for HTTPS
        });

        return res.status(200).json({ status: true, avatar: user.avatarImage });
    }catch(ex) {
        next(ex)
    }
}


module.exports.setAvatar = async (req, res, next) => {
    try{
        const {avatarImage} = req.body;
        const session = await Session.findOne({ _id: req.cookies.sessionId });

        const user = await User.findOneAndUpdate({ username: session.session.username }, {
            isAvatarImageSet: true,
            avatarImage
        })

        return res.json({isSet: user.isAvatarImageSet, image: user.avatarImage})
    }catch(ex) {
        next(ex)
    }
}


module.exports.getAllUsers = async (req, res, next) => {
    try {
      const users = await User.find({ _id: { $ne: req.params.id } }).select([
        "nickname",
        "avatarImage",
        "_id",
      ]);
      return res.json(users);
    } catch (ex) {
      next(ex);
    }
  };


// module.exports.logOut = (req, res, next) => {
// try {
//     if (!req.params.id) return res.json({ msg: "User id is required " });
//     onlineUsers.delete(req.params.id);
//     return res.status(200).send();
// } catch (ex) {
//     next(ex);
// }
// };
module.exports.logOut = async (req, res, next) => {
    try {
        console.log(req.cookies)
        const session = await Session.findOne({ _id: req.cookies.sessionId});
        const user = await User.findOne({ username: session.session.username });
        publicKeys.removeKey(user._id.toString())

        await Session.deleteOne({ _id: req.cookies.sessionId });


        // req.session.destroy();
        req.cookies.sessionId.destroy();

        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};


module.exports.checkAuth = async (req, res, next) => {
    try {
        // console.log(req.cookies, 'cok')
        const {publicKey} = req.body;
        // console.log(req.cookies.sessionId, 'cokdd')
        const session = await Session.findOne({ _id: req.cookies.sessionId});
        // console.log(session, 'session')
        // const session = await Session.findOne({ sessionId: req.cookies.sessionId });
        // console.log(session)
        const user = await User.findOne({ username: session.session.username }).select([
            "nickname",
            "avatarImage"
        ]);
        // console.log(user, 'user')
        if (session) {
            publicKeys.removeKey(user._id.toString())
            publicKeys.addKey({userId: user._id.toString(), publicKey});
            // const { key, iv } = genSymKey()
            const key = genSymKey()
            const privKey = privateKeys.getKey(user._id.toString());
            const encryptedSymKey = encryptWithPublicKey(publicKey, key)
            // const encrypteIv = encryptWithPublicKey(publicKey, iv)
            // const encrypteIv = encryptWithPublicKey(publicKey, '122121')
            // console.log(iv, 'iv iv')
            // const encryptedPrivateKey = symEncrypt(privKey[0].privateKey, key, iv)
            const encryptedPrivateKey = symEncrypt(privKey[0].privateKey, key)
            // const encryptedPrivateKey = '
            console.log()
            // console.log(encryptedPrivateKey, 'encryptedPrivateKey')
            // res.json({ success: true, nickname: user.nickname, image: user.avatarImage, _id: user._id, privateKey: encryptedPrivateKey, encryptedSymKey:encryptedSymKey, encrypteIv:encrypteIv });
            res.json({ success: true, nickname: user.nickname, image: user.avatarImage, _id: user._id, privateKey: encryptedPrivateKey, encryptedSymKey:encryptedSymKey });
        } else {
            privateKeys.removeKey(user._id.toString())
            res.json({ success: false });
        }
    } catch (ex) {
        console.log(ex);
        res.json({ success: false });
        next(ex);
    }
};


module.exports.searchUser = async (req, res, next) => {
    try {
        const session = await Session.findOne({ _id: req.cookies.sessionId });
        const user = await User.findOne({ username: session.session.username }).select([
            "id",
            "nickname",
            "avatarImage"
        ]);
        // console.log(user._id, 'user._id user._id user._id')
        const searchInput = req.body.searchInput.toLowerCase();
        const users = await User.find({ _id: { $ne: user._id } }).select([
            "nickname",
            "avatarImage",
            "_id",
        ]);
        const searchedUsers = users.filter(searchedUser => searchedUser.nickname.toLowerCase().search(searchInput)>-1)

        return res.json(searchedUsers);
    }catch (ex) {
        next(ex);
    }
};


module.exports.getAllFriends = async (req, res, next) => {
    try {
        const session = await Session.findOne({ _id: req.cookies.sessionId });
        if (!session) {
            return res.json({success: false});
        }
        const user = await User.findOne({ username: session.session.username })

        let allChats = [];
        for (userChat of user.chats){
            const chat = await Chat.findById(userChat.chatId)
            allChats.push(chat)
        }
        console.log(allChats, 'allChats')


        const allUsers = allChats.reduce((acc, chat) => acc.concat(chat.users), [])
        const uniqueUsersIds = (allUsers.map(userId => userId.toString())).filter(userId => userId !== user._id.toString())
        const uniqueUsers = new Set(uniqueUsersIds);

        let myFriends = []
        for (friendId of uniqueUsers){
            const friend = await User.findById(friendId).select([
                "nickname",
                "avatarImage",
                "_id",
            ])
            myFriends.push(friend)
        }

        console.log(myFriends, 'myFriends')

        return res.json({ success: true, myFriends})
    } catch (ex) {
        next(ex);
    }
}