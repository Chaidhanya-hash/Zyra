const productSchema = require('../../model/productSchema');
const cartSchema = require('../../model/cartSchema');

const {ObjectId} = require('mongodb');
const { product } = require('../adminController/productController');

//-------------------------------cart Page-------------------------

const cart = async (req,res) =>{
    if(!req.session.user){
        req.flash('error',"User is not found, Please Login agin");
        return res.redirect('/login');
    }
    try{
        const cart = await cartSchema.findOne({userId: req.session.user}).populate('items.productId')
        var totalPrice = 0;
        var totalPriceWithOutDiscount = 0;
        var cartItemCount = 0;
        if (cart) {
            cart.items.forEach((item) =>{
                if(item.productId.productDiscount === 0){
                    totalPrice += (item.productId.productPrice * item.productCount);
                    totalPriceWithOutDiscount += (item.productId.productPrice * item.productCount);
                } else {
                    const discountPrice = (item.productId.productPrice * item.productCount) - ((item.productId.productDiscount / 100) * (item.productId.productPrice * item.productCount))
                    totalPrice += discountPrice
                    totalPriceWithOutDiscount += (item.productId.productPrice * item.productCount)
                }

                cartItemCount += item.productCount
            })
            if(cart.payableAmount != totalPrice || cart.totalPrice != totalPriceWithOutDiscount) {
                cart.payableAmount = Math.round(totalPrice);
                cart.totalPrice = Math.round(totalPriceWithOutDiscount)
            }
            if(cart.payableAmount < 1000){
                cart.payableAmount = cart.payableAmount + 50;
            }
            await cart.save();
        }
        res.render('user/cart',{
            title:'Cart',
            cart,
            totalPrice,
            cartItemCount,
            search:'',
            totalPriceWithOutDiscount,
            alertMessage: req.flash('error'),
            user: req.session.user
        })
    }
    catch(error){
        console.log(`error in rendering cart page for user ${error}`);
    }
}

//-----------------------add product to cart------------------------------

const addToCartPost = async (req,res) =>{
    try{
        const productId = req.params.id;
        const userId = req.session.user;
        const productPrice = parseInt(req.query.price);
        const productQuantity = 1;
        const productDetails = await productSchema.findById(productId);
        if(productDetails.productQuantity <= 0){
            return res.status(404).json({error:"Product is Out of Stock"})
        }
        const checkCart = await cartSchema.findOne({userId: req.session.user}).populate('items.productId');
        if(checkCart){
            let productExist = false ;
            checkCart.items.forEach((item) =>{
                if(item.productId.id === productId){
                    productExist = true;
                    return res.status(404).json({error:"Product is already in the cart"});
                }
                
            });
            if(!productExist){
                checkCart.items.push({productId: productDetails._id, productCount: 1, productPrice: productPrice})
            }
            await checkCart.save();
        }
        else {
            const newCart = new cartSchema({
                userId: userId,
                items:[{productId:productDetails._id,productCount: 1, productPrice: productPrice}]
            });
            await newCart.save();
        }
        return res.status(200).json({message: 'Product added to cart'});
    }
    catch(error){
        console.log(`error in adding product to cart ${error}`);
    }
}

//---------------------------remove item from cart--------------------------

const removeItem = async(req,res) =>{
    const userId = req.session.user;
    const itemId = req.params.id;

    if(!itemId || !ObjectId.isValid(itemId)) {
        return res.status(400).json({success: false , message: 'Invalid Item'})
    }

    try {
        const cart = await cartSchema.findOne({userId:userId});
        if(cart){
            cart.items.pull({productId: new ObjectId(itemId)});
            await cart.save();
            return res.status(200).json({success: true , message:'Item removed from cart'});
        } else {
            console.log('No cart found for specified user');
            return res.status(404).json({success: false, message:'Cart not found'});
        }

    }
    catch(error){
        console.log(`error in removing the item from cart ${error}`);
        return res.status(500).json({sucess : false , message: 'Something went wrong, Please try again later!'})
    }
}

//------------------------------Quantity in cart------------------------

//---------------------incrementing product-------------------

const increment = async (req,res) =>{
    try {
        const { productId } = req.body;
        const userId = req.session.user;
        const max = 5;

        if(!userId || !productId){
            return res.status(400).send('Invalid Request');
        }

        const product = await productSchema.findById(productId);
        if(!product){
            return res.status(404).send('Product not found');
        }

        const cart = await cartSchema.findOne({userId});
        if(!cart){
            return res.status(404).send('Cart not found');
        }
        const productInCart = cart.items.find(p => p.productId.toString() === productId);

        if (productInCart) {
            const total = productInCart.productCount + 1;
            if (total > max) {
                return res.status(400).send("Maximum Quantity per Product is 5");
            }
            if (total > product.productQuantity) {
                return res.status(400).send(`Quantity of this product is ${product.productQuantity}`);
            }
            productInCart.productCount = total;
            await cart.save();
            res.status(200).json(cart);
        } else {
            res.status(404).send('Product not found in cart');
        }
    }
    catch(error){
        console.error(`Error incrementing product quantity in cart: ${error}`);
        showError(`Error incrementing product quantity in cart: ${error}`);
        res.status(500).send('Internal server error');
    }
}

//----------------------------decrementing product in cart------------------------------

const decrement = async (req, res) => {
    try {
        const userId = req.session.user;
        const { productId } = req.body;
        if (!userId || !productId) {
            return res.status(400).send('Invalid request');
        }
        const cart = await cartSchema.findOne({ userId });
        if (!cart) {
            return res.status(404).send('Cart not found');
        }
        const index = cart.items.findIndex(p => p.productId.toString() === productId);

        if (index > -1) {
            cart.items[index].productCount -= 1;
            if (cart.items[index].productCount <= 0) {
                cart.items.splice(index, 1);
            }
            await cart.save();
            res.status(200).json(cart);
        } else {
            res.status(404).send('Product not found in cart');
        }
    } catch (error) {
        console.error(`Error decrementing product quantity in cart: ${error}`);
        showError(`Error decrementing product quantity in cart: ${error}`);
        res.status(500).send('Internal server error');
    }
};

module.exports = {
    cart,
    addToCartPost,
    removeItem,
    increment,
    decrement
}