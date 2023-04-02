const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
    username: {type: String, required: true, min: 3, max:30, unique: true},
    nickname: {type: String, required: true, min: 3, max:30, unique: true},
    email: {type: String, required: true, min: 3, max:70},
    password: {type: String, required: true, min: 8, max:70},
    isAvatarImageSet : {
        type: Boolean,
        default: false
    },
    avatarImage: {
        type: String,
        default: ''
    },
    publicKey: {type: String, required: true},
    privateKey: {type: String, required: true},
    chats: [{
        chatId: {
            type: String,
            required: true
        },
        encryptionKey: {
            type: String,
            required: true
        },
        iv: {
            type: String,
            required: true
        },
        avatarImage: {
            type: String,
            default: ''
        },
        chatname: {type: String},
    }]
})

module.exports = mongoose.model("Users", userSchema)

// const mongoose = require('mongoose');
//
// const userSchema = new mongoose.Schema({
//     name: {
//         type: String,
//         required: true
//     },
//     nickname: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     password: {
//         type: String,
//         required: true
//     },
//     email: {
//         type: String,
//         required: true,
//         unique: true
//     },
//     chats: [
//         {
//             chatId: {
//                 type: mongoose.Schema.Types.ObjectId,
//                 ref: 'Chat'
//             },
//             encryptionKey: String
//         }
//     ]
// });
//
// const User = mongoose.model('User', userSchema);
//
// module.exports = User;
