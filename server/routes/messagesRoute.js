const { addMessage, getMessages, getMyChats, getChatMessages
    , getChatData, createChatIfNotExist, updateChat} = require("../controllers/messageController");

const router = require("express").Router();


router.post("/getmychats/", getMyChats);
router.post("/getchatmessages/", getChatMessages);
router.post("/addmsg/", addMessage);
router.post("/getmsg/", getMessages);
router.post("/getChatData/", getChatData);
router.post("/createChatIfNotExist/", createChatIfNotExist);
router.post("/updateChat/", updateChat);



module.exports = router;