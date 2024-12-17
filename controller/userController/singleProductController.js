const userSchema = require('../../model/userSchema');
const productSchema = require('../../model/productSchema');
const orderSchema = require('../../model/orderSchema');

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


module.exports = {
    checkOut
}