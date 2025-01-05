const userSchema = require('../../model/userSchema');
const categorySchema = require('../../model/categorySchema');
const productSchema = require('../../model/productSchema');
const wishlistSchema = require('../../model/wishlistSchema');
const mongoose = require('mongoose');

//-----------------products of particular category---------------

const category = async (req, res) => {
    const category_id = req.params.id || "";
    const search = req.query.search || "";
    const sortby = req.query.sortby || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const userId = req.session.user
    try {
      let sort="";
  
      if(sortby){
          switch(sortby){
            case '1': sort = {productName: 1}
                    break;
            case '2': sort = {productName: -1}
                    break;
            case '3': sort = {productPrice: 1}
                    break;
            case '4': sort = {productPrice: -1}
                    break;
            case '5': sort = {createdAt: -1}
                    break;
        }
      }else{
        sort = { createdAt: -1 }
      }

      let categoryName;
        if (mongoose.Types.ObjectId.isValid(category_id)) {
            // If it's a valid ObjectId, search by ID
            categoryName = await categorySchema.findOne({
                _id: category_id, 
                isActive: true
            });
        } else {
            // If it's not a valid ObjectId, search by name
            categoryName = await categorySchema.findOne({
                categoryName: category_id, 
                isActive: true
            });
        }

        if (!categoryName) {
            return res.status(404).send('Category not found');
        }

      const categoryProduct = await productSchema.find({productCategory: categoryName.categoryName , isActive : true , productName: { $regex: search, $options: 'i' }})
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
  
        const count = await productSchema.countDocuments({productCategory: categoryName.categoryName , productName: { $regex: search, $options: 'i' },isActive: true});
  
        const wishlist = await wishlistSchema.findOne({ userID: userId });
  
      res.render('user/category-product', {
        title: categoryName.categoryName,
        product: categoryProduct,
        user: req.session.user,
        categoryName:categoryName.categoryName,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        search,
        limit,page,
        wishlist
      })
    } catch (error) {
      console.log(`Error in Category-wise product rendering: ${error.message}`)
      res.status(500).send('Internal Server Error');
    }
  }


//---------------all products page rendering--------------------------

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

        const categories = await categorySchema.find();

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
            categories,
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
    allProduct,
    category
}
