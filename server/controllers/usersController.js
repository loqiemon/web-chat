const User = require('../model/userModel')
const bcrypt = require('bcrypt')

module.exports.register = async (req, res, next) => {
    try{
        const {password, username, email, nickname} = req.body;
        const usernameCheck = await User.findOne({ username })
        if (usernameCheck) {
            return res.json({msg: 'Логин занят', status: false})
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const user  = await User.create({
            email, username, password: hashedPassword, nickname
        });
        user.password = undefined;
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
