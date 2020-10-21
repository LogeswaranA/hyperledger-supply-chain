const mongoose = require('mongoose');
const Schema = mongoose.Schema;

//Create Schema

const ImageSchema = new Schema({
    imageData:{
        type:String,
        required:true
    },
    date:{
        type: Date,
        default: Date.now
    }
});

module.exports = Image = mongoose.model('images',ImageSchema);