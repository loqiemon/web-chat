const {encryptWithPublicKey, decryptWithPrivateKey, genAsymKey} = require('./crypto/crypto')


const {publicKey, privateKey} = genAsymKey()
console.log(publicKey)
console.log(privateKey)

const ff = 'hello world'gti
const encrypted = encryptWithPublicKey(publicKey, ff)
const decr = decryptWithPrivateKey(privateKey, encrypted )
console.log(decr)


// const NodeRSA = require('node-rsa');
//
//
// // const key = new NodeRSA({ b: 2048 });
// const key = new NodeRSA();
// key.importKey(publicKey, 'pkcs1-public-pem')
// key.importKey(privateKey, 'pkcs1-private-pem')
// // const publicKey = key.exportKey('pkcs8-public-pem');
// // const privateKey = key.exportKey('pkcs8-private-pem');
//
// const data = 'Hello, world!';
// const encrypted = key.encrypt(data, 'base64');
// const decrypted = key.decrypt(encrypted, 'utf8');
//
//
// console.log('Encrypted data:', encrypted);
// console.log('Decrypted data:', decrypted);
