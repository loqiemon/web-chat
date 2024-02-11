const mongoose = require('mongoose');

const authCodesSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    code: {type: String},
    expirationDate: { type: Date, default: () => Date.now() + 5 * 60 * 1000 } // 5 минут
});

authCodesSchema.index({ expirationDate: 1 }, { expireAfterSeconds: 0 });

const AuthCodes = mongoose.model('AuthCodesSchema', authCodesSchema);

module.exports = AuthCodes;
