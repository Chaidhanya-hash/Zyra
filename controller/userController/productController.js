const productSchema = require('../../model/productSchema')

const mongoose = require('mongoose');

const productDetail = async (req,res)=>{
    try {
        
        const id = req.params.id;
        

        if(!mongoose.Types.ObjectId.isValid(id)) {
            req.flash('error','Invalid Product Id');
            return res.redirect('/home');
        }

        const product = await productSchema.findById(id);

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
                        product,
                        similarProduct
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