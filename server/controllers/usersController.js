const User = require('../model/userModel')
const bcrypt = require('bcrypt')
const Messages = require("../model/messageModel");
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

        user.password = undefined;
        user.privateKey = undefined;
        user.publicKey = undefined;
        return res.json({status: true, user: user.toJSON()})
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

        user.password = undefined;
        user.privateKey = undefined;
        user.publicKey = undefined;
        return res.json({status: true, user: user.toJSON()})
    }catch(ex) {
        next(ex)
    }
}


module.exports.setAvatar = async (req, res, next) => {
    try{
        const {avatarImage, userId} = req.body;
        const userData = await User.findByIdAndUpdate(userId, { 
            isAvatarImageSet: true,
            avatarImage,
         })
        
        return res.json({isSet: userData.isAvatarImageSet, image: userData.avatarImage})
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


module.exports.logOut = (req, res, next) => {
try {
    if (!req.params.id) return res.json({ msg: "User id is required " });
    onlineUsers.delete(req.params.id);
    return res.status(200).send();
} catch (ex) {
    next(ex);
}
};


module.exports.searchUser = async (req, res, next) => {
    try {
        const searchInput = req.body.searchInput.toLowerCase();
        console.log(searchInput)
        const users = await User.find({ _id: { $ne: req.body.currentUserId } }).select([
            "nickname",
            "avatarImage",
            "_id",
        ]);
        const searchedUsers = users.filter(user => user.nickname.toLowerCase().search(searchInput)>-1)
        return res.json(searchedUsers);
    }catch (ex) {
        next(ex);
    }
};