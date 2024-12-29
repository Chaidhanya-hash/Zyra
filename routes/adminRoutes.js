const express = require('express');
const admin = express.Router();
const adminController = require('../controller/adminController/adminController');
const userController = require('../controller/adminController/userController');
const categoryController = require('../controller/adminController/categoryController');
const productController = require('../controller/adminController/productController');
const orderController = require('../controller/adminController/orderController');
const couponController = require('../controller/adminController/couponController');
const offerController = require('../controller/adminController/offerController');

const {upload} = require('../uploads/cloudinary');
const { isAdmin } = require('../middleware/adminSession');

//-----------------------admin Login--------------------------

admin.get('/login',adminController.login);

admin.post('/login',adminController.loginPost);

//--------------------admin Dashboard-------------------------

admin.get('/dashboard',isAdmin,(req,res)=>{
    res.render('admin/dashboard',{
        title:'Dashboard'
    });
})

//----------------------customer details----------------------

admin.get('/customers',isAdmin,userController.customers);

admin.get('/customerstatus',isAdmin,userController.status);

//-------------------------------products----------------------

admin.get('/products',isAdmin,productController.product);

admin.get('/addproduct',isAdmin,productController.addProduct);

admin.get('/productstatus',isAdmin,productController.status);

admin.post('/addproduct',upload.array('images',4),productController.addProductPost);

admin.get('/editproduct/:id',isAdmin,productController.editProduct);

admin.post('/editproduct/:id',isAdmin,upload.array('images',4),productController.editProductPost);

admin.get('/products/:id',isAdmin,productController.deleteProduct);

//------------------------------category-----------------------

admin.get('/category',isAdmin,categoryController.category);

admin.post('/addcategory',isAdmin,categoryController.addCategoryPost);

admin.get('/categorystatus',isAdmin,categoryController.status);

admin.post('/editcategory',isAdmin,categoryController.editCategory);

//------------------------orders-------------------------

admin.get('/orders',isAdmin,orderController.orderPage);

admin.post('/order/:orderId/status',isAdmin,orderController.orderStatus);

admin.get('/order-view/:id',isAdmin,orderController.orderView);

//----------------------Coupons--------------------------

admin.get('/coupons/:id?', isAdmin, couponController.getCoupons);

admin.post('/addcoupon', isAdmin, couponController.addCoupon);

admin.post('/editcoupon/:id', isAdmin, couponController.editCoupon);

admin.get('/statuscoupon', isAdmin, couponController.toggleCouponStatus);

//-----------------------------offer------------------------

admin.get('/offer', isAdmin, offerController.getOffer);

admin.post('/addOffer',isAdmin,offerController.addOffer);

admin.post('/editOffer',isAdmin,offerController.editOffer);

admin.get('/offerStatus',isAdmin,offerController.offerStatus);

//-------------------------Logout--------------------------

admin.get('/logout',adminController.logout);


module.exports = admin;