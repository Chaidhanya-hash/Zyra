const { type } = require('express/lib/response');
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    productName:{
        type:String,
        required:true
    },
    productPrice:{
        type:Number,
        required:true
    },
    productDescription:{
        type:String,
        required:true
    },
    productQuantity:{
        type:Number,
        required:true
    },
    productDiscount:{
        type:Number
    },
    productCategory:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    isActive:{
        type:Boolean,
        default:true
    },
    productBrand:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brand',
        required: true
    },
    sellingPrice: {
        type: Number,
        default: null
    }
},{timestamps:true});

module.exports = mongoose.model('product',schema);