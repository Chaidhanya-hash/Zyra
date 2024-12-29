const userSchema = require('../../model/userSchema');
const productSchema = require('../../model/productSchema');
const orderSchema = require('../../model/orderSchema');
const couponSchema = require('../../model/couponSchema');


const checkOut = async (req,res) =>{
    try{
        const productId = req.params.id;
        if(!req.session.user){
            req.flash('error','User is not found, Please login again');
            res.redirect('/login');
        }

        const userId = req.session.user;
        const user = await userSchema.findById(userId);

        if(!user){
            return res.status(404).send('User not found');
        }

        const product = await productSchema.findById(productId);
        if(product.productQuantity <= 0){
            req.flash('error','Product is Out of Stock');
            res.redirect('/home');
        } else if(product.isActive !== true){
            req.flash('error','Product is currently unavailable');
            res.redirect('/home');
        }

        res.render('user/singleCheckout',{
            title:'Checkout',
            user,
            product,
            userDetails: user
        })
    }
    catch(error){
        console.log(`error while rendering checkout page for single product ${error}`);
        res.status(500).send('An error occurred while processing your request');
    }
}


const editAddress = async (req,res) =>{
    const index = Number(req.params.index);
    const id = req.session.user;
    const context = 'Profile';

    try {
        const getAddress = await userSchema.findOne({ _id: id }, { address: { $slice: [index, 1] } });

        if (getAddress) {
            res.render('user/editAddress', { title: "edit address", data: getAddress.address[0], index , context, user: req.session.user});
        } else {
            res.redirect('/product-checkout/:id');
        }
    }
    catch(error){
        console.log(`error in editing address in single checkout page ${error}`);
    }
}

const singleOrder = async (req,res) =>{
    try {
        const userId = req.session.user;
        const addressIndex = parseInt(req.params.address);
        const paymentMode = parseInt(req.params.payment);
        const productId = req.params.id;
        let couponDiscount = 0;
        let paymentId = "";

        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, payment_status, couponCode} = req.body;

        if (paymentMode === 2) {
            paymentId = razorpay_payment_id;
        }

        const product = await productSchema.findById(productId);
        if(!product){
            console.log(`Product not found for ID: ${productId}`);
            return res.status(400).json({ success: false, message: 'Your product is empty or could not be found.'})
        }

        const paymentDetails = ["Cash on delivery", "Wallet", "razorpay"];
        if(paymentDetails[paymentMode] === 'Cash on delivery'){
            if(product.productPrice > 1000){
                return res.status(400).json({ success: false, message:'COD below 1000 only'});
            }
        }

        const userDetails = await userSchema.findById(userId);
        if(!userDetails || !userDetails.address || !userDetails.address[addressIndex]) {
            return res.status(400).json({success: false, message: 'Selected address is not valid'});
        }

        const newOrder = new orderSchema({
            customer_id: userId,
            order_id: Math.floor(Math.random() * 1000000),
            products:[{
                product_id: product._id,
                product_name: product.productName,
                product_category: product.productCollection,
                product_quantity: 1,
                product_price: product.productPrice,
                product_discount: product.productDiscount,
                product_image: product.productImage[0],
                product_status: 'Confirmed'
            }],
            totalQuantity: 1,
            totalPrice: product.productPrice - product.productPrice * (product.productDiscount /100),
            couponDiscount: couponDiscount,
            address:{
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
        });

        await newOrder.save();

        product.productQuantity -= 1;
        if(product.productQuantity <=0){
            product.productQuantity = 0;
        }

        await product.save();
        return res.status(200).json({success: true, message: 'Order Places Successfully'});
    }
    catch(error){
        console.log(`error in single product ordering ${error}`);
    }
}

//---------------------------appling coupon in single checkout page------------------------

const coupon = async (req, res) => {
    try {
        const couponName = req.body.couponCode;

        const total = req.body.totalAmount;
        const userId = req.session.user;

        if (!userId) {
            req.flash('error', "User is not found, please login again");
            return res.redirect('/login');
        };

        const coupon = await couponSchema.findOne({ code: couponName });
        if (!coupon) {
            return res.status(404).json({ error: "Coupon not found" });
        };

        if (!coupon.isActive || coupon.expiryDate < new Date()) {
            return res.status(400).json({ error: "Coupon expired" });
        };

        let discountedTotal = total;

        if (total < coupon.minimumOrderAmount) {
            return res.status(400).json({ error: "Minimum purchase limit not reached." });
        };

        const couponDiscount = coupon.discountValue;

        if (coupon.discountType === "Fixed") {
            discountedTotal = total - couponDiscount;
        } else if (coupon.discountType === "Percentage") {
            const discountAmount = (couponDiscount / 100) * total;
            discountedTotal = total - discountAmount;
        };

        res.status(200).json({ total: discountedTotal, couponDiscount });
    } catch (err) {
        console.log(`Error in apply coupon: ${err}`);
        res.status(500).json({ error: "An error occurred while applying the coupon." });
    }
};

module.exports = {
    checkOut,
    editAddress,
    singleOrder,
    coupon
}