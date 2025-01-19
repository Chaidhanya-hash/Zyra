const offerSchema = require('../../model/offerSchema')
const categorySchema= require('../../model/categorySchema')
const productSchema = require('../../model/productSchema')

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

//---------------------------offer Page-------------------------

const getOffer = async (req,res)=>{
    const search = req.query.search ? req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    
    try {
        const offers = await offerSchema.find({ offerType: { $regex: search, $options: 'i' } })
            .populate('referenceId')
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({ updatedAt : -1 });

        const count = await offerSchema.countDocuments({ offerType: { $regex: search, $options: 'i' } });
        const products = await productSchema.find({isActive: true}).sort({createdAt: -1})
        const categories = await categorySchema.find({isActive: true}).sort({createdAt: -1})

        res.render('admin/offer',{
            title: "Offers",
            offers,
            products,
            categories,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            search,
            limit,page
        })
        
    } catch (error) {
        console.log(`error while render Offer Page ${error}`)
    }
}

//-----------------------------add offer----------------------------------

const addOffer = async (req, res) => {
    try {
        const { offerType, referenceId, discountPercent } = req.body;

        // Check for missing fields
        if (!offerType || !referenceId || !discountPercent) {
            req.flash('error', 'All fields are required');
            return res.redirect('/admin/offer');
        }

        // Check for valid discount percent
        if (discountPercent > 98) {
            req.flash('error', 'Discount amount cannot exceed 98%');
            return res.redirect('/admin/offer');
        }

        // Check if the offer already exists
        const offerExists = await offerSchema.findOne({ referenceId });
        if (offerExists) {
            req.flash('error', 'Offer Already Exists');
            return res.redirect('/admin/offer');
        }

        if (offerType === 'category') {
            const category = await categorySchema.findById(referenceId);
            if (!category) {
                req.flash('error', 'Category not found');
                return res.redirect('/admin/offer');
            }

            // Delete existing category offers
            await offerSchema.deleteOne({ offerType: 'category', referenceId: category._id });

            // Add new category offer
            const newOffer = new offerSchema({
                offerType,
                referenceId: category._id,
                discountPercent,
            });
            await newOffer.save();

            // Update all products under this category
            const allProducts = await productSchema.find({ productCategory: category.categoryName });
            const bulkOperations = allProducts.map(product => ({
                updateOne: {
                    filter: { _id: product._id },
                    update: {
                        productDiscount: discountPercent
                    },
                },
            }));

            if (bulkOperations.length > 0) {
                await productSchema.bulkWrite(bulkOperations);
            }

            req.flash('success', `Offer added for the products under ${category.categoryName}`);
        } else if (offerType === 'product') {
            const product = await productSchema.findById(referenceId);
            if (!product) {
                req.flash('error', 'Product not found');
                return res.redirect('/admin/offer');
            }

            // Delete existing product offers
            await offerSchema.deleteOne({ offerType: 'product', referenceId: product._id });

            // Add new product offer
            const newOffer = new offerSchema({
                offerType,
                referenceId: product._id,
                discountPercent,
            });
            await newOffer.save();

            // Update product discount and discount price
            product.productDiscount = discountPercent;
            await product.save();

            req.flash('success', `Offer added for the product ${product.productName}`);
        }
        res.redirect('/admin/offer');
    } catch (error) {
        console.error(`Error from addOffer: ${error}`);
        req.flash('error', 'An error occurred while adding the offer');
        res.redirect('/admin/offer');
    }
};

//------------------------edit offer----------------------------

const editOffer = async (req, res) => {
    try {
        const { offerId, offerType, referenceId, discountPercent } = req.body;

        // Validation checks
        if (!offerId || !referenceId || !discountPercent) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        if (discountPercent > 98 || discountPercent <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Discount amount cannot exceed 98% and should be greater than 0'
            });
        }

        let alertMessage = '';

        if (offerType === 'category') {
            const category = await categorySchema.findOne({ categoryName: referenceId });

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            const offer = await offerSchema.findByIdAndUpdate(offerId, { 
                referenceId: category._id, 
                discountPercent 
            });
            
            if (!offer) {
                return res.status(404).json({
                    success: false,
                    message: 'Offer not found'
                });
            }

            // Update all products under this category
            const allProducts = await productSchema.find({ productCategory: category.categoryName });
            const bulkOperations = allProducts.map(product => ({
                updateOne: {
                    filter: { _id: product._id },
                    update: {
                        productDiscount: discountPercent,
                    },
                },
            }));

            if (bulkOperations.length > 0) {
                await productSchema.bulkWrite(bulkOperations);
            }

            alertMessage = `Offer updated for the products under ${category.categoryName}`;

        } else if (offerType === 'product') {
            const product = await productSchema.findById(referenceId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const offer = await offerSchema.findByIdAndUpdate(offerId, { 
                referenceId, 
                discountPercent 
            });
            
            if (!offer) {
                return res.status(404).json({
                    success: false,
                    message: 'Offer not found'
                });
            }

            // Update product discount
            product.productDiscount = discountPercent;
            await product.save();

            alertMessage = `Offer updated for the product ${product.productName}`;
        }
        
        return res.status(200).json({
            success: true,
            message: alertMessage
        });

    } catch (error) {
        console.log(`Error from editOffer: ${error}`);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while editing the offer'
        });
    }
}

//-------------------------- offer status ----------------------------

const offerStatus = async (req,res)=>{
    try {
        const offerId = req.query.id
        const status = !(req.query.status === 'true')

        const offer = await offerSchema.findByIdAndUpdate(offerId,{isActive: status})

        res.redirect('/admin/offer')
        
    } catch (error) {
        console.log(`error from orderStatus ${error}`)
    }
}

module.exports = {
    getOffer,
    addOffer,
    editOffer,
    offerStatus
}