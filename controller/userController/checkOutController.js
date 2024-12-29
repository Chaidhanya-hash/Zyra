const productSchema = require('../../model/productSchema')
const cartSchema = require('../../model/cartSchema')
const userSchema = require('../../model/userSchema')
const orderSchema = require('../../model/orderSchema')
const couponSchema = require('../../model/couponSchema');

const {ObjectId} = require('mongodb');

const Razorpay = require('razorpay');

//----------------------checkout page rendering------------------

const checkout = async (req,res) =>{
    try{
        if(!req.session.user){
            req.flash('error','User not found, Please login again');
            return res.redirect('/login');
        }

        const userId = req.session.user;
        const user = await userSchema.findById(userId);
        if(!user){
            return res.status(404).send('User not found');
        }

        const cartDetails = await cartSchema.findOne({userId}).populate("items.productId");
        if(!cartDetails){
            return res.status(404).send('Cart not found');
        }

        const items = cartDetails.items;
        if(items.length === 0){
            return res.redirect('/cart');
        }

        cartDetails.items.forEach((item) =>{
            if(item.productId.isActive != true){
                req.flash('error','Product is not available, remove product from cart');
                res.redirect('/cart');
            }
        })

        res.render('user/checkOut',{
            title:'Checkout',
            user,
            cartDetails,
            userDetails: user
        })
    }
    catch(error){
        console.log(`error in rendering checkout page from cart ${error}`);
        res.status(500).send('An error occurred while processing your request');
    }
}

//--------------------------Add Address--------------------------------

const addAddress = async (req, res) => {
    try {
        const userAddress = {
            building:req.body.building,
            street:req.body.street,
            city:req.body.city,
            phonenumber:req.body.phonenumber,
            pincode:req.body.pincode,
            landmark:req.body.landmark,
            state:req.body.state,
            country:req.body.country
        }
        const user = await userSchema.findById(req.session.user)
        if (user.address.length > 3) {
            req.flash("error", "Maximum Address limit Reached")
            return res.redirect('/profile')
        }
        user.address.push(userAddress);
        await user.save();

        req.flash('success', 'New address added')
        res.redirect('/checkOut')
    } catch (err) {
        console.log(`Error on adding new address from checkout ${err}`);
    }
}

//-------------------------Edit Address----------------------

const editAddress = async (req,res) =>{
    const index = Number(req.params.index);
    const id = req.session.user;
    const context = 'Checkout';
    try {
        const getAddress = await userSchema.findOne({_id: id},{address: { $slice: [index,1] } });

        if(getAddress){
            res.render('user/editAddress',{
                title:'Edit Address',
                data:getAddress.address[0],
                index,
                user:req.session.user,
                context
            })
        } else {
            res.redirect('/checkOut');
        }
    }
    catch(error){
        console.log(`error in editing address from checkout page ${error}`);
        req.flash('error','error while rendering Edit adress page, Please try again later');
        res.redirect('/checkOut');
    }
}

//-----------------updating existing address---------------------

const updateAddress = async (req,res) =>{
    const id = req.session.user;
    const index = parseInt(req.params.index, 10);
    const data = {
        building : req.body.building,
        street : req.body.street,
        city : req.body.city,
        state : req.body.state,
        country : req.body.country,
        pincode :req.body.pincode,
        phoneNumber : req.body.phonenumber,
        landmark : req.body.landmark
    }
    try {
        const updateQuery = {};
        updateQuery[`address.${index}`] = data;

        const result = await userSchema.updateOne(
            {_id: new ObjectId(id)},
            {$set : updateQuery}
        )

        req.flash('success','Address updated succssfully');
        res.redirect('/checkOut');
    }
    catch(error){
        console.log(`error while editing the address ${error}`);
        req.flash('error','Cannot update the address right now, Please try again later');
        res.redirect('/checkOut');
    }
}

//------------------------Delete address------------------------

const removeAddress = async (req,res) =>{
    try {
        const userId = req.session.user;
        const index = parseInt(req.params.index, 10);

        const user = await userSchema.findById(userId).populate('address');
        if(!user){
            req.flash('error','user not found');
            res.redirect('/login');
        }

        if(isNaN(index) || index < 0 || index >= user.address.length){
            req.flash('error','Invalid address');
            return res.redirect('/checkOut');
        }

        user.address.splice(index,1);
        await user.save();

        req.flash('success','Address deleted Successfully');
        res.redirect('/checkOut');
    }
    catch(error) {
        console.log(`error in removing address from checkout page ${error}`);
        req.flash('error','Failed to delete address. Please try again later');
        res.redirect('/checkOut');
    }
}

//------------------------placing order---------------------

const placeOrder = async (req,res) =>{
    try {
        const userId = req.session.user;
        const addressIndex = parseInt(req.params.address);
        const paymentMode = parseInt(req.params.payment);
        let couponDiscount = 0;
        let paymentId = "";

        const {razorpay_payment_id, razorpay_order_id, razorpay_signature, payment_status , couponCode} = req.body;

        if (couponCode) {
            const coupon = await couponSchema.findOne({ code: couponCode });
            if (coupon && coupon.isActive) {
                couponDiscount = coupon.discountValue;
            }
        }

        if (paymentMode === 2){
            paymentId = razorpay_payment_id;
        }

        const cartItems = await cartSchema.findOne({userId}).populate("items.productId");
        
        if(!cartItems || !cartItems.items || cartItems.items.length === 0){
            return res.status(400).json({success: false, message:'Your cart is empty or could not be found. '});
        }

        const paymentDetails = ["Cash on delivery", "Wallet", "razorpay"];
        if(paymentDetails[paymentMode] === "Cash on delivery"){
            if(cartItems.payableAmount > 1000){
                return res.status(400).json({ success: false, message:"COD below 1000 only"});
            }
        }

        const products = [];
        let totalQuantity = 0;
        cartItems.items.forEach((item)=>{
            products.push({
                product_id: item.productId._id,
                product_name: item.productId.productName,
                product_category: item.productId.productCollection,
                product_quantity: item.productCount,
                product_price: item.productId.productPrice,
                product_discount:item.productId.productDiscount,
                product_image: item.productId.productImage[0],
                product_status: 'Confirmed'
            });
            totalQuantity += item.productCount;
        });

        const userDetails = await userSchema.findById(req.session.user);
        if(!userDetails || !userDetails.address || !userDetails.address[addressIndex]){
            return res.status(400).json({success: false, message: 'Selected address is not valid'})
        }

        const newOrder = new orderSchema({
            customer_id: req.session.user,
            order_id: Math.floor(Math.random() * 1000000),
            products: products,
            totalQuantity: totalQuantity,
            totalPrice: cartItems.payableAmount,
            couponCode : couponCode,
            couponDiscount: couponDiscount,
            address: {
                customer_name: userDetails.name,
                customer_email: userDetails.email,
                building: userDetails.address[addressIndex].building,
                street: userDetails.address[addressIndex].street,
                city: userDetails.address[addressIndex].city,
                country: userDetails.address[addressIndex].country,
                pincode: userDetails.address[addressIndex].pincode,
                phonenumber: userDetails.address[addressIndex].phoneNumber,
                landMark: userDetails.address[addressIndex].landmark
            },
            paymentMethod: paymentDetails[paymentMode],
            orderStatus: payment_status === "Pending" ? "Pending" : "Confirmed",
            paymentId: paymentId,
            paymentStatus: payment_status,
            isCancelled: false
        })

        await newOrder.save();

        for(const element of cartItems.items){
            const product = await productSchema.findById(element.productId._id);
            if(product){
                product.productQuantity -= element.productCount;
                if(product.productQuantity < 0){
                    product.productQuantity = 0;
                }

                await product.save();
            }
        }

        await cartSchema.deleteOne({userId : req.session.user});
        return res.status(200).json({success :  true,message: 'Order Placed Successfully'});
    }
    catch(error){
        console.log(`error in placing order ${error}`);
        return res.status(500).json({success: false, message: `Error on placing order ${error.message}`});
    }
}

//-------------------order successfull page---------------------

const orderPage = async (req,res) =>{
    try {
        const userId = req.session.user;
        const user = await userSchema.findById(userId);

        const orders = await orderSchema.findOne({customer_id: userId}).sort({createdAt: -1}).limit(1);
        res.render('user/conform-order',{
            title:'Order confirmed',
            orders: orders
        })
    }
    catch(error){
        console.log(`error in rendering order conform page ${error}`);
    }
}

//---------------------------------Razor Pay---------------------------------

const paymentRender = (req,res) => {
    try {

        const totalAmount = req.params.amount;
        if(!totalAmount) {
            return res.status(400).json({ error: 'Amount parameter is missing'});
        }

        const instance = new Razorpay({
            key_id: 'rzp_test_KDYrLJHnu3O9Ip',
            key_secret: 'bcOjtnHN19lrbqBWdS35Ee7J'
        });

        const options = {
            amount: totalAmount * 100,
            currency: "INR",
            receipt: "receipt#1"
        }

        instance.orders.create(options, (error,order) =>{
            if (error) {
                console.log(`Failed to create order ${error}`);
                return res.status(500).json({ error: `Failed to create order ${error.message}`});
            }

            return res.status(200).json({ orderID: order.id})
        })

    }
    catch(error){
        console.log(`Error on orders in checkout ${error}`);
        return res.status(500).json({ error: 'Internal server error'});
    }
}

//-------------------------------coupon--------------------------------

const coupon = async (req, res) => {
    try {
        const couponName = req.body.couponCode;
        const userId = req.session.user;

        if (!userId) {
            req.flash('error', "User is not found, please login again");
            return res.redirect('/login');
        }

        const coupon = await couponSchema.findOne({ code: couponName });
        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        }

        if (!coupon.isActive || coupon.expiryDate < new Date()) {
            return res.status(400).json({ error: "Coupon expired" });
        }

        // check if coupon already used
        const Used  = await orderSchema.findOne({customer_id:userId,couponCode:couponName,orderStatus: { $in: ['Delivered', 'Shipped'] }})

        // if already used return an error
        if(Used){
            return res.status(404).json({ error: "Coupon Already Used" });
        }

        const cart = await cartSchema.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ error: "Cart not found" });
        }

        const total = cart.payableAmount;
        let discountedTotal = total;

        if (total < coupon.minimumOrderAmount) {
            return res.status(400).json({ error: "Minimum purchase limit not reached. Please add more items to your cart." });
        }

        const couponDiscount = coupon.discountValue;
        if (coupon.discountType === "Fixed") {
            discountedTotal = total - couponDiscount;
        } else if (coupon.discountType === "Percentage") {
            const discountAmount = (couponDiscount / 100) * total;
            discountedTotal = total - discountAmount;
        }

        cart.payableAmount = discountedTotal;
        await cart.save();

        res.status(200).json({ total: discountedTotal, couponDiscount });
    } catch (err) {
        console.log(`Error in apply coupon: ${err}`);
        res.status(500).json({ error: "An error occurred while applying the coupon." });
    }
};

module.exports = {
    addAddress,
    checkout,
    placeOrder,
    orderPage,
    removeAddress,
    editAddress,
    updateAddress,
    paymentRender,
    coupon
}