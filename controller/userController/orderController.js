const { status } = require('express/lib/response');
const orderSchema = require('../../model/orderSchema');
const productSchema = require('../../model/productSchema');
const walletSchema = require('../../model/walletSchema');

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

        if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'Wallet' ) {
            const userWallet = await walletSchema.findOne({ userID: order.customer_id });
            if (userWallet) {
                userWallet.balance = (userWallet.balance || 0) + order.totalPrice;
                userWallet.transaction.push({
                    wallet_amount: order.totalPrice,
                    order_id: order.order_id,
                    transactionType: 'Credited',
                    transaction_date: new Date()
                });
                await userWallet.save();
            } else {
                await walletSchema.create({
                    userID: order.customer_id,
                    balance: order.totalPrice,
                    transaction: [{
                        wallet_amount: order.totalPrice,
                        order_id: order.order_id,
                        transactionType: 'Credited',
                        transaction_date: new Date()
                    }]
                });
            }
        }

        for(let product of order.products){
            if(product.product_id && product.product_quantity !== undefined){
                await productSchema.findByIdAndUpdate(product.product_id, { $inc: {productQuantity: product.product_quantity } });
            } else {
                console.log(`Invalid product data: ${JSON.stringify(product)}`);
                return res.redirect('/orders');
            }
        };
        
        res.status(200).send('Order cancelled successfully');
        
        
    }
    catch(error){
        console.log(`error in canceling order ${error}`);
        req.flash('error', 'Cannot cancel this order right now, please try again');
        res.redirect('/orders');
    }
}

//---------------------------Return order-----------------------

const returnOrder = async (req,res) => {
    try {
        const {orderId, returnReason} = req.body;

        if (!orderId || !returnReason) {
            return res.status(400).json({ status: 'error', message: 'Order ID and return reason are required' });
        }

        const order = await orderSchema.findById(orderId);

        if (!order) {
            return res.status(404).json({ status: 'error', message: 'Order not found' });
        }

        if (order.orderStatus === 'Returned' || order.orderStatus === 'Cancelled') {
            return res.status(400).json({ status: 'error', message: 'Order is already returned or cancelled' });
        }

        order.orderStatus = 'Returned';
        order.returnReason = returnReason;
        await order.save();

        for (let product of order.products) {
            if (product.product_id && product.product_quantity !== undefined) {
                await productSchema.findByIdAndUpdate(product.product_id, { $inc: { productQuantity: product.product_quantity } });
            } else {
                console.error(`Invalid product data: ${JSON.stringify(product)}`);
                req.flash('error', 'Error updating product quantity');
                return res.redirect('/orders');
            }
        }

        return res.status(200).json({ status: 'success', message: 'Order return request submitted successfully' });
    }
    catch(error) {
        console.log(`Error in processing return request ${error}`);
        return res.status(500).json({ status: 'error', message: 'An error occurred while processing the return request'})
    }

}

module.exports = {
    orderPage,
    orderDetails,
    cancelOrder,
    returnOrder
}