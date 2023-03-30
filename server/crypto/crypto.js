const crypto = require('crypto');


function genSymKey(){
     const key = crypto.randomBytes(32); // Генерация случайного 256-битного ключа
     const iv = crypto.randomBytes(16); // Генерация случайного вектора инициализаци
     return {key, iv}
}
function symEncrypt(message, key, iv) {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function symDecrypt(encrypted, key, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


function genAsymKey(){
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });
    return { publicKey, privateKey }
}

// Шифрование сообщения с помощью открытого ключа
function encryptWithPublicKey(publicKey, message) {
    const buffer = Buffer.from(message, 'utf8');
    const encrypted = crypto.publicEncrypt(publicKey, buffer);
    return encrypted.toString('base64');
}

// Дешифрование сообщения с помощью закрытого ключа
function decryptWithPrivateKey(privateKey, encrypted) {
    const buffer = Buffer.from(encrypted, 'base64');
    const decrypted = crypto.privateDecrypt(privateKey, buffer);
    return decrypted.toString('utf8');
}


module.exports = { genSymKey, genAsymKey, encryptWithPublicKey,symEncrypt, decryptWithPrivateKey, symDecrypt };





