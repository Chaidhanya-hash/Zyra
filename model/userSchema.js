const mongoose = require('mongoose');
const addressSchema = require('./addressSchema');

const schema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    phone:{
        type:Number
    },
    email:{
        type:String,
        required:true
    },
    password:{
        type:String
    },
    isActive:{
        type:Boolean,
        default:true
    },
    address:{
        type:[addressSchema],
        default:[]
    },
    googleID:{
        type:String
    },
    facebookID:{
        type:String
    }

},{timestamps:true})


module.exports = mongoose.model('user',schema);