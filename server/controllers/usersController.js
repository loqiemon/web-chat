const User = require('../model/userModel')
const bcrypt = require('bcrypt')
const Messages = require("../model/messageModel");
const Chat = require("../model/chatModel");
const Session = require("../model/sessionSchema");
const crypto = require('crypto');
const {genAsymKey, symEncrypt, encryptWithPassword, decryptWithPassword, encryptWithPublicKey, genSymKey,
    verifySignature
} = require("../crypto/crypto");
const publicKeys = require('../crypto/publicKeys');
const privateKeys = require('../crypto/privateKeys');
const axios = require("axios");
const {addBlock} = require("../routes/apiRoutes");
const path = require("path");
const fs = require("fs");
const AuthCodes = require('../model/authCodes')
const nodemailer = require('nodemailer');

function generateCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    const charactersLength = characters.length;

    for (let i = 0; i < 5; i++) {
        code += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return code;
}

async function sendTwoFactorCode(code, userMail){
    const transporter = nodemailer.createTransport({
        service: "Gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: 'webchattwofactor@gmail.com',
            pass: 'anwm lmqf vunu ayok'
        }
    });

    const mailOptions = {
        from: 'webchattwofactor@gmail.com',
        to: userMail,
        subject: 'Двухфакторный код',
        text: `Ваш код: ${code}`
    };

    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}


module.exports.register = async (req, res, next) => {
    try{
        const {password, username, email, nickname} = req.body;
        //Нужна валидация данных
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
        const user = await User.findOne({ username})
        if (!user) {
            return res.json({msg: 'Неверный логин или пароль', status: false})
        }
        // const hashedPassword = await bcrypt.hash(password, 10)
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid){
            return res.json({msg: 'Неверный логин или пароль', status: false})
        }

        const newCode = generateCode();
        await AuthCodes.deleteOne({user: user._id})
        await AuthCodes.create({user, code: newCode})
        await sendTwoFactorCode(newCode, user.email)
        // const decryptedPrivateKey = decryptWithPassword(user.privateKey, password)
        // privateKeys.addKey({userId: user._id.toString(), privateKey: decryptedPrivateKey})
        //
        // const session = new Session({ session: { username } });
        // await session.save();
        // const sessionId = session._id.toString();
        //
        // res.cookie('sessionId', sessionId, {
        //     // expires: new Date(Date.now() + 900000),
        //     httpOnly: true,
        //     // httpOnly: false,
        //     secure: true,
        //     sameSite: "None",
        //     // sameSite: true,
        //     // sameSite: false,
        //     // maxAge: 2 * 60 * 1000,
        //     maxAge: 24 * 60 * 60 * 1000,
        //     domain: 'localhost',
        //     path: '/',
        //     // secure: false //  true for HTTPS
        // });

        return res.status(200).json({ status: true, avatar: user.avatarImage });
    }catch(ex) {
        next(ex)
    }
}

module.exports.finalAuth = async (req, res, next) => {
    const {password, username, code} = req.body;
    const user = await User.findOne({ username})
    if (!user) {
        return res.json({msg: 'Неверный логин или пароль', status: false})
    }

    const isCodeExist = await AuthCodes.findOne({user: user._id})

    if (!isCodeExist) return res.json({msg: 'Неверный код', status: false})
    if (isCodeExist.code !== code) return res.json({msg: 'Неверный код', status: false})


    const decryptedPrivateKey = decryptWithPassword(user.privateKey, password)
    privateKeys.addKey({userId: user._id.toString(), privateKey: decryptedPrivateKey})

    const session = new Session({ session: { username } });
    await session.save();
    const sessionId = session._id.toString();

    res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 24 * 60 * 60 * 1000,
        domain: 'localhost',
        path: '/',
    });

    return res.status(200).json({ status: true, avatar: user.avatarImage });
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
        const {publicKey} = req.body;
        const session = await Session.findOne({ _id: req.cookies.sessionId});
        const user = await User.findOne({ username: session.session.username }).select([
            "nickname",
            "avatarImage"
        ]);
        if (session) {
            publicKeys.removeKey(user._id.toString())
            publicKeys.addKey({userId: user._id.toString(), publicKey});
            const key = genSymKey()
            const privKey = privateKeys.getKey(user._id.toString());
            const encryptedSymKey = encryptWithPublicKey(publicKey, key)
            const encryptedPrivateKey = symEncrypt(privKey[0].privateKey, key)
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

        // const isThisUser = verifySignature(user._id, req.body.sign, user.publicKey);
        // if (!isThisUser) {
        //     return res.json({success: false});
        // }
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


module.exports.getSomeUsers = async (req, res, next) => {
    try {
        const {chatId} = req.body
        const session = await Session.findOne({ _id: req.cookies.sessionId });
        if (!session) {
            return res.json({success: false});
        }
        const user = await User.findOne({ username: session.session.username })
        const chat = await Chat.findById(chatId)

        let foundUsers = []

        for (userToFind of chat.users){
            // for (userToFind of usersToFind){
                const foundUser = await User.findById(userToFind.toString()).select([
                    "nickname",
                    "avatarImage",
                    "_id",
                ]);
                foundUsers.push(foundUser)
            }


        return res.json({success: true, foundUsers});
    } catch (ex) {
        next(ex);
    }
};


module.exports.getPublicKey = async (req, res, next) => {
    try {
        const {userId} = req.body
        const user = await User.findById(userId)
        if (user) {
            return res.json({success: true, publicKey: user.publicKey});
        }else {
            return res.json({success: false})
        }
    } catch (ex) {
        next(ex);
    }
};
