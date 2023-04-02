const mongoose = require('mongoose');


const sessionSchema = new mongoose.Schema({
    sessionId: String,
    session: Object,
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 * 24 * 7 // время жизни сессии (в секундах)
    }
});


const Session = mongoose.model('Session', sessionSchema);

module.exports = Session