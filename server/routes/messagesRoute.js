const { addMessage, getMessages, getMyChats, getChatMessages} = require("../controllers/messageController");
const router = require("express").Router();


router.post("/getmychats/", getMyChats);
router.post("/getchatmessages/", getChatMessages);
router.post("/addmsg/", addMessage);
router.post("/getmsg/", getMessages);



module.exports = router;