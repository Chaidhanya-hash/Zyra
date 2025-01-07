const categorySchema = require('../../model/categorySchema');
const productSchema = require('../../model/productSchema');

const mongoose = require('mongoose');
const wishlistSchema = require('../../model/wishlistSchema');

const productDetail = async (req,res)=>{
    try {
        const search = '';
        const id = req.params.id;
        const userId = req.session.user;

        if(!mongoose.Types.ObjectId.isValid(id)) {
            req.flash('error','Invalid Product Id');
            return res.redirect('/home');
        }

        const product = await productSchema.findById(id);
        const categories = await categorySchema.find();
        const wishlist = await wishlistSchema.findOne({ userID: userId });

        if(!product){
            
            req.flash('error','Product not found');
            return res.redirect('/home')
        }
        
        if(product.isActive){
            const similarProduct = await productSchema.find({
                productCategory:product.productCategory,
                isActive:true
            })
            
            return res.render('user/productDetail',{
                        title: product.productName,
                        user:req.session.user,
                        search,
                        categories,
                        product,
                        similarProduct,
                        wishlist
                    })
        } else {
            req.flash('error','Product is not available');
            return res.redirect('/home');
        }

        
    }
    catch(error){
        console.log(`Error in rendering product detail page ${error}`);
    }
}

module.exports ={
    productDetail
}