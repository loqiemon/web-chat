const router = require('express').Router()
const {register, login, setAvatar, getAllUsers, logOut, searchUser, checkAuth} = require('../controllers/usersController.js')


router.post('/register', register)
router.post('/login', login)
router.post('/setavatar', setAvatar)
router.get('/allusers/:id', getAllUsers)
// router.get("/logout/:id", logOut);
router.get("/logout/", logOut);
router.post("/searchUser/", searchUser);
router.post("/checkAuth/", checkAuth);
router.get('/get', (req, res) => {
    console.log('Cookie: ', req.cookies)
    res.send('Get Cookie')
})


router.get('/set-cookie', (req, res) => {
    res.cookie('token', '12345ABCDE')
    res.send('Set Cookie')
})

module.exports = router