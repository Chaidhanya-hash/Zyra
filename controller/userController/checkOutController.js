const productSchema = require('../../model/productSchema')
const cartSchema = require('../../model/cartSchema')
const userSchema = require('../../model/userSchema')
const orderSchema = require('../../model/orderSchema')
const {ObjectId} = require('mongodb');

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

        const {payment_status , couponCode} = req.body;

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

module.exports = {
    addAddress,
    checkout,
    placeOrder,
    orderPage,
    removeAddress,
    editAddress,
    updateAddress
}