const orderSchema = require('../../model/orderSchema');

//-------------------order page rendering---------------

const orderPage = async (req,res) =>{
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        let query = {};

        if(search){
            const searchNumber = Number(search);
            if(!isNaN(searchNumber)) {
                query.order_id = searchNumber;
            }
        }

        const orders = await orderSchema.find(query)
            .sort({ createdAt: -1})
            .limit(limit)
            .skip((page - 1) * limit);

        const count = await orderSchema.countDocuments(query);

        res.render('admin/order',{
            title:"Order Details",
            orders,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            search,
            limit
        });
    }
    catch(error){
        console.log(`error in rendering admin order page ${error}`);
    }
}

//---------------------changing order status--------------------

const orderStatus = async (req,res) =>{
    try {
        const {orderId} = req.params;
        const {status} = req.body;

        const validStatuses = ['Pending', 'Shipped', 'Confirmed', 'Delivered', 'Cancelled', 'Returned'];
        const currentOrder = await orderSchema.findOne({_id:orderId});

        if(!currentOrder){
            return res.status(404).send('Order not found');
        }

        if(validStatuses.indexOf(status) <= validStatuses.indexOf(currentOrder.status)){
            return req.flash('error','Invalid status change');
        }

        currentOrder.orderStatus = status;
        await currentOrder.save();
        res.status(200).send('Order status updated');
        
    }
    catch(error){
        console.log(`error in changing order status from admin side ${error}`);
    }
}

//---------------------------Single order details------------------------

const orderView = async (req,res) =>{
    const order_id = req.params.id;
    try {
        const orderDetails = await orderSchema.findOne({_id: order_id})
        res.render('admin/order-view',{
            title:"view Order",
            orderDetails
        })
    }
    catch(error){
        console.log(`error in rendering orderview page ${error}`);
        res.redirect('/admin/orders');
    }
}

module.exports = {
    orderPage,
    orderStatus,
    orderView
}