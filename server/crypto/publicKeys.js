
let publicKeys = [];

module.exports = {
    addKey: (key) => {
        publicKeys.push(key);
        console.log(publicKeys)
    },
    removeKey: (userId) => {
        publicKeys = publicKeys.filter(k => k.userId !== userId);
    },
    getKey: (userId) => {
        return publicKeys.filter(k => k.userId == userId);
    },
};
