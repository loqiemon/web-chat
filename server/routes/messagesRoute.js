const { addMessage, getMessages, getMyChats, checkIfChatExist} = require("../controllers/messageController");
const router = require("express").Router();


router.post("/getmychats/", getMyChats);
router.post("/ifchatexists/", checkIfChatExist);
router.post("/addmsg/", addMessage);
router.post("/getmsg/", getMessages);



module.exports = router;