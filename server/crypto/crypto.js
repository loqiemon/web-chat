const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const NodeRSA = require('node-rsa');


function genSymKey(){
     const key = crypto.randomBytes(32); // Генерация случайного 256-битного ключа
     const iv = crypto.randomBytes(16); // Генерация случайного вектора инициализаци
        console.log(key, 'ggen')
     return {key, iv}
}
function symEncrypt(message, key, iv) {
    const symKey =  Buffer.from(key, 'base64')
    const symIv = Buffer.from(iv, 'base64')
    // const symKey = crypto.randomBytes(32); // Генерация случайного 256-битного ключа
    // const symIv = crypto.randomBytes(16); // Генерация случайного вектора инициализаци
    console.log(symKey, 'symKey')
    console.log(symIv, 'symIv')
    const cipher = crypto.createCipheriv('aes-256-cbc',symKey , symIv);
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function symDecrypt(encrypted, key, iv) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}


function genAsymKey(){
    // const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    //     modulusLength: 2048,
    //     publicKeyEncoding: {
    //         type: 'spki',
    //         format: 'pem'
    //     },
    //     privateKeyEncoding: {
    //         type: 'pkcs8',
    //         format: 'pem'
    //     }
    // });
    const key = new NodeRSA({ b: 2048 });
    const privateKey = key.exportKey('pkcs1-private-pem');
    const publicKey = key.exportKey('pkcs8-public-pem');
    return { publicKey, privateKey }
}


function encryptWithPublicKey(publicKey, message) {
    // const buffer = Buffer.from(message, 'utf8');
    // const encrypted = crypto.publicEncrypt(publicKey, buffer);.
    const key = new NodeRSA();
    key.importKey(publicKey, 'pkcs8-public-pem');
    const encrypted = key.encrypt(message, 'base64');
    return encrypted;
    // return encrypted.toString('base64');
}


function decryptWithPrivateKey(privateKey, encrypted) {
    // const buffer = Buffer.from(encrypted, 'base64');
    // const decrypted = crypto.privateDecrypt(privateKey, buffer);
    const key = new NodeRSA();
    key.importKey(privateKey, 'pkcs1-private-pem');
    const decrypted = key.decrypt(encrypted, 'utf8');
    return decrypted;
    // return decrypted.toString('utf8');
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





