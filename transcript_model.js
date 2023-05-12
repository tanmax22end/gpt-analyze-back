const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let Trans = new Schema({
    role: {
        type: String
    },
    content: {
        type: String
    }
});

module.exports = mongoose.model('Trans', Trans);