const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const NodeRSA = require('node-rsa');


function genSymKey(){
    const keySize = 256 / 32; // 256 бит = 32 байта
    const key = CryptoJS.lib.WordArray.random(keySize);
     return key.toString()
}
function symEncrypt(message, key, iv) {
    const encrypted = CryptoJS.AES.encrypt(message, key).toString();
    return encrypted;
}

function symDecrypt(encrypted, key, iv) {
    const bytes = CryptoJS.AES.decrypt(encrypted, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
}


function genAsymKey(){
    const key = new NodeRSA({ b: 2048 });
    const privateKey = key.exportKey('pkcs1-private-pem');
    const publicKey = key.exportKey('pkcs8-public-pem');
    return { publicKey, privateKey }
}


function encryptWithPublicKey(publicKey, message) {
    var privateKey = new NodeRSA(publicKey, 'public', { encryptionScheme: 'pkcs1' }); // specify PKCS#1 v1.5 padding
    var ciphertext = privateKey.encrypt(message).toString('base64');
    return ciphertext
}


function decryptWithPrivateKey(privateKey, encrypted) {
    const key = new NodeRSA(privateKey, 'pkcs1-private-pem', { encryptionScheme: 'pkcs1' });
    const decrypted = key.decrypt(encrypted, 'utf8');
    return decrypted;
}


function encryptWithPassword(text, password) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(password, 'salt', 32);
    const cipher = crypto.createCipheriv(algorithm, key, Buffer.alloc(16, 0));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function decryptWithPassword(encrypted, password) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(password, 'salt', 32);
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.alloc(16, 0));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}



module.exports = { genSymKey, genAsymKey, encryptWithPublicKey,symEncrypt, decryptWithPrivateKey, symDecrypt, encryptWithPassword, decryptWithPassword };





