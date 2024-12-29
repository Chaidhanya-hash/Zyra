const mongoose = require('mongoose');

const product=new mongoose.Schema({
    productID:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"product"
    }
},{_id:false,timestamps:true})

const schema = new mongoose.Schema({
    userID: {
        type: String
    },
    products: [product]
}, { timestamps: true });

module.exports = mongoose.model('wishlist', schema);