const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatname: {type: String},
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    private: {type: Boolean},
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
