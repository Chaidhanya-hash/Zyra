const userSchema = require('../../model/userSchema');
const categorySchema = require('../../model/categorySchema');
const productSchema = require('../../model/productSchema');


const categoryget = async(req,res)=>{
    try {
        const category = await categorySchema.find({isActive: true});
        res.render('user/category',{
            title:'Category',
            user:req.session.user,
            category
        });
    }
    catch(error){
        console.log(`error in rendering category page ${error}`);
    }
}

const allProduct = async(req,res)=>{
    try{
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        const category = await categorySchema.find({isActive:true});
        const product = await productSchema.find({isActive:true});

    
        
        // const product = await productSchema.find(productFilter)
        //     .skip((page-1) *limit)
        //     .limit(limit);
        
        const count = await productSchema.countDocuments({product})
        
        res.render('user/allproduct',{
            title:"All products",
            user:req.session.user,
            product,
            category,
            search,
            totalPages: Math.ceil(count / limit),
            currentPage:page,
            page,
            limit
        })
    }
    catch(error){
        console.log(`error in all products rendering ${error}`);
    }
}

module.exports = {
    categoryget,
    allProduct
}
