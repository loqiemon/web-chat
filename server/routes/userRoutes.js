const router = require('express').Router()
const {register, login, setAvatar, getAllUsers, logOut, searchUser, checkAuth, getAllFriends, getSomeUsers, getPublicKey, addFile} = require('../controllers/usersController.js')


router.post('/register', register)
router.post('/login', login)
router.post('/setavatar', setAvatar)
router.get('/allusers/:id', getAllUsers)
// router.get("/logout/:id", logOut);
router.get("/logout/", logOut);
router.post("/searchUser/", searchUser);
router.post("/checkAuth/", checkAuth);
router.post("/getAllFriends/", getAllFriends);
router.post("/getSomeUsers/", getSomeUsers);
router.post("/getPublicKey/", getPublicKey);
// router.post("/addFile/", addFile);


module.exports = router