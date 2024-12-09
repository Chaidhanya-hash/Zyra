const express = require('express');
const admin = express.Router();
const adminController = require('../controller/adminController/adminController');
const userController = require('../controller/adminController/userController');
const categoryController = require('../controller/adminController/categoryController');
const productController = require('../controller/adminController/productController');
const {upload} = require('../uploads/cloudinary');

//-----------------------admin Login--------------------------

admin.get('/login',adminController.login);

admin.post('/login',adminController.loginPost);

//--------------------admin Dashboard-------------------------

admin.get('/dashboard',(req,res)=>{
    res.render('admin/dashboard');
})

//----------------------customer details----------------------

admin.get('/customers',userController.customers);

admin.get('/customerstatus',userController.status);

//-------------------------------products----------------------

admin.get('/products',productController.product);

admin.get('/addproduct',productController.addProduct);

admin.get('/productstatus',productController.status);

admin.post('/addproduct',upload.array('images',4),productController.addProductPost);

admin.get('/editproduct/:id',productController.editProduct);

admin.post('/editproduct/:id',upload.array('images',4),productController.editProductPost);

admin.get('/products/:id',productController.deleteProduct);

//------------------------------category-----------------------

admin.get('/category',categoryController.category);

admin.post('/addcategory',categoryController.addCategoryPost);

admin.get('/categorystatus',categoryController.status);

admin.get('/editcategory',categoryController.editCategory);




module.exports = admin;