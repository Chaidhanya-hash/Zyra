const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    brandName:{
        type:String,
        required:true,
        trim:true
    },
    isActive:{
        type:Boolean,
        default:true
    }
},{ timestamps: true });

module.exports=mongoose.model('Brand',schema);