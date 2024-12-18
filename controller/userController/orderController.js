const orderSchema = require('../../model/orderSchema');
const productSchema = require('../../model/productSchema');

//--------------------------user orders page-------------------------

const orderPage = async (req,res) =>{
    try {
        const user = req.session.user;
        if(!user){
            req.flash('error','User not found, Please login again');
            return res.redirect('/login');
        }

        const orderDetails = await orderSchema.find({ customer_id: user}).populate("products.product_id").sort({updatedAt: -1 })
        res.render('user/orders',{
            title:"Orders",
            user,
            orderDetails
        })
    }
    catch(error){
        console.log(`error in rendering users order page ${error} `);
        req.flash('error','error in rendering order page, Please try again later');
        res.redirect('/home');
    }
}

//------------------------order Details-----------------------

const orderDetails = async (req,res) =>{
    const user = req.session.user;
    const order_id = req.params.id;
    try {
        const orderDetails = await orderSchema.findOne({_id: order_id});
        res.render('user/orderDetail',{
            title:"Order Details",
            user,
            orderDetails
        })
    
    }
    catch(error){
        console.log(`error in rendering order details page in user ${error}`);
        res.redirect('/orders');
    }
}

//-------------------------------cancel order---------------------

const cancelOrder = async (req,res) =>{
    try {
        const user = req.session.user;
        const orderId = req.params.id;

        if(!orderId){
            req.flash('error','Invalid Order Id');
            return res.redirect('/orders');
        }

        const order = await orderSchema.findByIdAndUpdate(orderId, { orderStatus: 'Cancelled', isCancelled: true});
        if(!order){
            req.flash('error','Order not found');
            return res.redirect('/orders');
        }

        for(let product of order.products){
            if(product.product_id && product.product_quantity !== undefined){
                await productSchema.findByIdAndUpdate(product.product_id, { $inc: {productQuantity: product.product_quantity } });
            } else {
                console.log(`Invalid product data: ${JSON.stringify(product)}`);
                return res.redirect('/orders');
            }
        }

        req.flash('success','Order cancelled Successfully');
        res.redirect('/orders');
    }
    catch(error){
        console.log(`error in canceling order ${error}`);
        res.redirect('/orders');
    }
}

module.exports = {
    orderPage,
    orderDetails,
    cancelOrder
}