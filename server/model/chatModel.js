const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatname: {type: String},
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    private: {type: Boolean},
    avatarImage: {
        type: String,
        default: ''
    },
    lastActivity: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
