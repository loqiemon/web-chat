const {encryptWithPublicKey, decryptWithPrivateKey, genAsymKey} = require('./crypto/crypto')


const {publicKey, privateKey} = genAsymKey()
const ff = 'hello world'
const encrypted = encryptWithPublicKey(ff, publicKey)
const decr = decryptWithPrivateKey(encrypted, privateKey)



const NodeRSA = require('node-rsa');


const key = new NodeRSA({ b: 2048 });
const publicKey = key.exportKey('pkcs8-public-pem');
const privateKey = key.exportKey('pkcs8-private-pem');

const data = 'Hello, world!';
const encrypted = key.encrypt(data, 'base64');
const decrypted = key.decrypt(encrypted, 'utf8');


console.log('Encrypted data:', encrypted);
console.log('Decrypted data:', decrypted);
