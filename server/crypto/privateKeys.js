let privateKeys = [];

module.exports = {
    addKey: (key) => {
        privateKeys.push(key);
        console.log(privateKeys, 'privateKeys')
    },
    removeKey: (userId) => {
        privateKeys = privateKeys.filter(k => k.userId !== userId);
    },
    getKey: (userId) => {
        return privateKeys.filter(k => k.userId == userId);
    },
};