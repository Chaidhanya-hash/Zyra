const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    customer_id:{
        type: String
    },
    order_id:{
        type: Number
    },
    products:[{
        product_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref: "product"
        },
        product_name:{
            type: String
        },
        product_category:{
            type: String
        },
        product_quantity:{
            type: Number
        },
        product_price:{
            type: Number
        },
        product_discount:{
            type: Number
        },
        product_image:{
            type: String
        },
        product_status:{
            type: String,
            enum:['Confirmed','Failed', 'Pending', 'Delivered', 'Returned', 'Cancelled'],
            default:'Pending'
        }
    }],
    totalQuantity: {
        type: Number
    },
    totalPrice: {
        type: Number
    },
    address: {
        customer_name: String,
        customer_email: String,
        building: String,
        street: String,
        city: String,
        country: String,
        pincode: Number,
        phonenumber:Number,
        landMark:String,
        state: String
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Cash on delivery','razorpay', 'Wallet']
    },
    paymentId: {
        type: String,
        required: false
    },
    paymentStatus:{
        type:String,
        required: false
    },
    isCancelled: {
        type: Boolean,
        default: false
    },
    couponCode:{
        type: String,
    },
    couponDiscount:{
        type: Number,
        default: 0
    },
    orderStatus: {
        type: String,
        enum:['Pending','Failed', 'Shipped', 'Confirmed', 'Delivered', 'Cancelled', 'Returned']
        
    }
},{timestamps: true})

module.exports = mongoose.model("Order",schema);