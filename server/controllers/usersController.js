const User = require('../model/userModel')
const bcrypt = require('bcrypt')
const Messages = require("../model/messageModel");
const Session = require("../model/sessionSchema");
const crypto = require('crypto');
const {genAsymKey} = require("../crypto/crypto");



module.exports.register = async (req, res, next) => {
    try{
        const {password, username, email, nickname} = req.body;
        const usernameCheck = await User.findOne({ username })
        if (usernameCheck) {
            return res.json({msg: 'Логин занят', status: false})
        }
        const { publicKey, privateKey } = genAsymKey()

        const hashedPassword = await bcrypt.hash(password, 10)


        const user  = await User.create({
            email, username, password: hashedPassword, nickname, publicKey, privateKey: privateKey
        });

        //sess
        const session = new Session({ session: { username } });
        await session.save();
        const sessionId = session._id.toString();
        console.log(sessionId, 'sess sessionId')
        res.cookie('sessionId', sessionId, { maxAge: 86400000, httpOnly: true });

        console.log(user)
        return res.json({status: true, avatar: user.avatarImage})
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


        const session = new Session({ session: { username } });
        await session.save();
        const sessionId = session._id.toString();
        console.log(sessionId, 'sess sessionId')
        res.cookie('sessionId', sessionId, { maxAge: 86400000, httpOnly: true });

        console.log(user)
        return res.json({status: true, avatar: user.avatarImage})
    }catch(ex) {
        next(ex)
    }
}


module.exports.setAvatar = async (req, res, next) => {
    try{
        const {avatarImage} = req.body;
        const session = await Session.findOne({ sessionId: req.cookies.sessionId });
        // console.log(session)
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
        // удаление сессии из базы данных
        await Session.deleteOne({ sessionId: req.cookies.sessionId });

        // уничтожение сессии на клиенте
        // req.session.destroy();
        req.cookies.sessionId.destroy();

        res.json({ success: true });
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};


module.exports.checkAuth = async (req, res) => {
    try {
        // поиск сессии в базе данных
        console.log(req.cookies, 'cok')
        const session = await Session.findOne({ _id: undefined});
        console.log(session, 'session')
        // const session = await Session.findOne({ sessionId: req.cookies.sessionId });
        // console.log(session)
        const user = await User.findOne({ username: session.session.username }).select([
            "nickname",
            "avatarImage"
        ]);
        // console.log(user, 'user')
        // если сессия найдена, то пользователь авторизован
        if (session) {
            res.json({ success: true, nickname: user.nickname, image: user.avatarImage  });
        } else {
            res.json({ success: false });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false });
    }
};


module.exports.searchUser = async (req, res, next) => {
    try {
        const session = await Session.findOne({ sessionId: req.cookies.sessionId });
        const user = await User.findOne({ username: session.session.username }).select([
            "id",
            "nickname",
            "avatarImage"
        ]);
        console.log(user._id, 'user._id user._id user._id')
        const searchInput = req.body.searchInput.toLowerCase();
        console.log(searchInput)
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