
const blockchainHost = "http://127.0.0.1:8084/";
const addSegment = `${blockchainHost}/add_segment`;
const addTransaction = `${blockchainHost}/add_transaction`;
const addBlock = `${blockchainHost}/add_block`;
const getSegmentShard = `${blockchainHost}get_segment_shard`;


module.exports = {blockchainHost, addSegment ,addBlock, addTransaction,getSegmentShard};