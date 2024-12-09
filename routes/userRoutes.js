const express = require('express');
const user = express.Router();
const userController = require('../controller/userController/userController');
const categoryController = require('../controller/userController/categoryController');
const productController = require('../controller/userController/productController');
//------------------------login---------------------

user.get('/login',userController.login);

user.post('/login',userController.loginPost);

//------------------google login---------------------

user.get('/auth/google',userController.googleAuth);
user.get('/auth/google/callback',userController.googleAuthCallback);


//----------------------------signup--------------------

user.get('/signup', userController.signup);

user.post('/signup',userController.signuppost);

//---------------------otp verification------------------

user.get('/otp', userController.otp);

user.post('/otp',userController.otppost);

user.get('/resendotp',userController.otpResend);

//----------------------home-----------------------------

user.get('/home', userController.home)

//----------------------category-----------------------

user.get('/category',categoryController.categoryget);

//-------------------products----------------------

user.get('/allproduct',categoryController.allProduct);

user.get('/productDetail/:id',productController.productDetail);

module.exports = user;  
