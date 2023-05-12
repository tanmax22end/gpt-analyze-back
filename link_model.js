const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let Todo = new Schema({
    link_description: {
        type: String
    },
    video_id: {
        type: String
    }
});

module.exports = mongoose.model('Todo', Todo);