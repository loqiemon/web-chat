const { getMyChats,
    getChatData, createChatIfNotExist, updateChat, saveChats, createCommonChat} = require("../controllers/messageController");

const router = require("express").Router();


router.post("/getmychats/", getMyChats);
router.post("/getChatData/", getChatData);
router.post("/createChatIfNotExist/", createChatIfNotExist);
router.post("/updateChat/", updateChat);
router.post("/saveChats/", saveChats);
router.post("/createCommonChat/", createCommonChat);



module.exports = router;