const userSchema = require('../../model/userSchema');
const categorySchema = require('../../model/categorySchema');
const productSchema = require('../../model/productSchema');
const wishlistSchema = require('../../model/wishlistSchema');


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
        const minPrice = parseInt(req.query.minPrice) || 0;
        const maxPrice = parseInt(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const sortBy = req.query.sortBy || 'newArrivals';
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const userId = req.session.user;

        const category = await categorySchema.find({isActive:true});

        const wishlist = await wishlistSchema.findOne({ userID: userId });
        

        let selectedCategories = req.query.productCategory
            ? (Array.isArray(req.query.productCategory) ? req.query.productCategory: [req.query.productCategory])
            : category.map(cat => cat.categoryName);

        let categoryIds = [];
        if(selectedCategories.length > 0){
            const categoryDocs = await categorySchema.find({ categoryName: {$in: selectedCategories } } );
            categoryIds = categoryDocs.map(cat => cat.categoryName);
        }

        const productQuery = {
            productName : { $regex: search, $options: 'i'},
            productCategory : { $in: categoryIds},
            isActive: true,
            productPrice: {$gte: minPrice, $lte: maxPrice}
        };

        let sortOption = {};
        switch (sortBy) {
        case 'priceLowToHigh':
            sortOption = { productPrice: 1 };
            break;
        case 'priceHighToLow':
            sortOption = { productPrice: -1 };
            break;
        case 'nameAsc':
            sortOption = { productName: 1 };
            break;
        case 'nameDesc':
            sortOption = { productName: -1 };
            break;
        default:
            sortOption = { createdAt: -1 };
        }

        const product = await productSchema.find(productQuery).populate('productCategory')
            .sort(sortOption)
            .limit(limit)
            .skip((page - 1) * limit);

        
        
        
        const count = await productSchema.countDocuments(productQuery)
        
        res.render('user/allproduct',{
            title:"All products",
            user:req.session.user,
            product,
            category,
            query: req.query,
            search,
            totalPages: Math.ceil(count / limit),
            currentPage:page,
            wishlist,
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
