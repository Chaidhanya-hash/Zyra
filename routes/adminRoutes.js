const express = require('express');
const admin = express.Router();
const adminController = require('../controller/adminController/adminController');
const userController = require('../controller/adminController/userController');
const categoryController = require('../controller/adminController/categoryController');
const productController = require('../controller/adminController/productController');
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

//-------------------------Logout--------------------------

admin.get('/logout',adminController.logout);


module.exports = admin;