const userSchema = require('../../model/userSchema');
const categorySchema = require('../../model/categorySchema');
const productSchema = require('../../model/productSchema');
const wishlistSchema = require('../../model/wishlistSchema');

const mongoose = require('mongoose');
const brandSchema = require('../../model/brandSchema');

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

        const categories = await categorySchema.find();
  
      res.render('user/category-product', {
        title: categoryName.categoryName,
        product: categoryProduct,
        user: req.session.user,
        categoryName:categoryName.categoryName,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        search,
        limit,page,
        wishlist,
        categories
      })
    } catch (error) {
      console.log(`Error in Category-wise product rendering: ${error.message}`)
      res.status(500).send('Internal Server Error');
    }
  }


//---------------all products page rendering--------------------------

const allProduct = async(req,res) => {
    try {
        const sanitizedQuery = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 12,
            minPrice: parseInt(req.query.minPrice) || 0,
            maxPrice: parseInt(req.query.maxPrice) || Number.MAX_SAFE_INTEGER,
            sortBy: req.query.sortBy || 'newArrivals',
            search: req.query.search ? req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : "",
            productCategory: req.query.productCategory ? 
                (Array.isArray(req.query.productCategory) ? 
                    req.query.productCategory : [req.query.productCategory]) 
                : []
        };

        const userId = req.session.user;

        // Get active brands and categories
        const [activeBrands, category, categories, wishlist] = await Promise.all([
            brandSchema.find({ isActive: true }),
            categorySchema.find({ isActive: true }),
            categorySchema.find(),
            userId ? wishlistSchema.findOne({ userID: userId }) : null
        ]);

        

        const activeBrandIds = activeBrands.map(brand => brand._id);

        let selectedCategories = sanitizedQuery.productCategory.length > 0 
            ? sanitizedQuery.productCategory 
            : category.map(cat => cat.categoryName);

        let categoryIds = [];
        if(selectedCategories.length > 0) {
            const categoryDocs = await categorySchema.find({ categoryName: { $in: selectedCategories } });
            categoryIds = categoryDocs.map(cat => cat.categoryName);
        }

        // Update product query to include active brands
        const productQuery = {
            productName: { $regex: sanitizedQuery.search, $options: 'i' },
            productCategory: { $in: categoryIds },
            productBrand: { $in: activeBrandIds },
            isActive: true,
            sellingPrice: { 
                $gte: sanitizedQuery.minPrice, 
                $lte: sanitizedQuery.maxPrice 
            }
        };
        
        
        let sortOption = {};
        
        switch (sanitizedQuery.sortBy) {
            case 'priceLowToHigh':
                sortOption = { sellingPrice: 1 };
                break;
            case 'priceHighToLow':
                sortOption = { sellingPrice: -1 };
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

        // Get products and count concurrently
        const [product, count] = await Promise.all([
            productSchema.find(productQuery)
                .populate('productCategory')
                .populate('productBrand') // Optionally populate brand info
                .sort(sortOption)
                .limit(sanitizedQuery.limit)
                .skip((sanitizedQuery.page - 1) * sanitizedQuery.limit),
            productSchema.countDocuments(productQuery)
        ]);

        res.render('user/allproduct', {
            title: "All products",
            user: req.session.user,
            product,
            category,
            categories,
            query: sanitizedQuery, // Pass sanitized query to view
            search: sanitizedQuery.search,
            totalPages: Math.ceil(count / sanitizedQuery.limit),
            currentPage: sanitizedQuery.page,
            wishlist,
            page: sanitizedQuery.page,
            limit: sanitizedQuery.limit
        });
    } catch(error) {
        console.log(`error in all products rendering ${error}`);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    allProduct,
    category
}
