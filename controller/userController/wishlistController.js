const wishlistSchema = require('../../model/wishlistSchema');
const productSchema = require('../../model/productSchema');
const cartSchema = require('../../model/cartSchema');
const categorySchema = require('../../model/categorySchema');

const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

//-----------------------Wishlist Page--------------------------

const wishlistpage = async(req, res) => {
    try {
        if (!req.session.user) {
            req.flash('error', "User is Not Found, Please Login Again");
            return res.redirect('/login');
        }

        const [categories, wishlist] = await Promise.all([
            categorySchema.find(),
            wishlistSchema.findOne({ userID: req.session.user })
                .populate({
                    path: 'products.productID',
                    select: 'productName productPrice productImage productDiscount productDescription isActive'
                })
        ]);

        // Filter out any products that might be null or inactive
        const validProducts = wishlist?.products.filter(item => 
            item.productID && item.productID.isActive
        ) || [];

        res.render('user/wishlist', {
            title: "Wishlist",
            products: validProducts,
            search: '',
            categories,
            user: req.session.user
        });

    } catch(error) {
        console.log(`Error while rendering wishlist page: ${error}`);
        req.flash('error', 'Failed to load wishlist');
        res.redirect('/');
    }
};

//------------------------------Adding product to wishlist----------------------

const addWishlist = async (req, res) => {
    try {
        const productID = req.params.id;
        const userID = req.session.user;
        
        // Validate product exists
        const product = await productSchema.findById(productID);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Find or create wishlist
        let wishlist = await wishlistSchema.findOne({ userID });
        
        if (wishlist) {
            // Check if product already exists in wishlist
            const productExists = wishlist.products.some(item => 
                item.productID && item.productID.toString() === productID.toString()
            );

            if (productExists) {
                return res.status(400).json({ error: "Product already in wishlist" });
            }

            // Add product to existing wishlist
            wishlist.products.push({ productID: productID });
            await wishlist.save();
            return res.status(200).json({ message: "Product added to wishlist" });
        } else {
            // Create new wishlist with product
            wishlist = new wishlistSchema({
                userID,
                products: [{ productID: productID }]
            });
            await wishlist.save();
            return res.status(200).json({ message: "Product added to wishlist" });
        }
    } catch (err) {
        console.error(`Error adding product to wishlist: ${err}`);
        return res.status(500).json({ error: "Error adding product to wishlist" });
    }
};

//----------------------------------Delete Wishlist-----------------------------

const deleteWishlist = async (req, res) => {
    const userId = req.session.user;
    const itemId = req.params.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: 'User not found. Please login again.' });
    }
    if (!itemId || !ObjectId.isValid(itemId)) {
        return res.status(400).json({ success: false, message: 'Invalid item.' });
    }
    try {
        const wish = await wishlistSchema.findOne({ userID: userId });
        if (wish) {
            wish.products.pull({ productID: new ObjectId(itemId) });
            await wish.save();
            return res.json({ success: true, message: 'Item removed from wishlist.' });
        } else {
            return res.status(404).json({ success: false, message: 'Wishlist not found.' });
        }
    } catch (err) {
        console.error(`Error in removing the item from wishlist: ${err}`);
        return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' });
    }
};

module.exports = {
    wishlistpage,
    addWishlist,
    deleteWishlist
}
