const express = require('express');
const user = express.Router();

const checkUser = require('../middleware/checkUserSession');
const activeUser = require('../middleware/activeUserSession');



const userController = require('../controller/userController/userController');
const categoryController = require('../controller/userController/categoryController');
const productController = require('../controller/userController/productController');
const forgotPassword = require('../controller/userController/forgotPassword');
const profileController = require('../controller/userController/profileController');
const cartController = require('../controller/userController/cartController');
const singleProductController = require('../controller/userController/singleProductController');
const checkoutController = require('../controller/userController/checkOutController');
const orderController = require('../controller/userController/orderController');
const wishlistController = require('../controller/userController/wishlistController');
const walletController = require('../controller/userController/walletController');
//------------------------login---------------------

user.get('/login',userController.login);

user.post('/login',userController.loginPost);

//------------------google login---------------------

user.get('/auth/google',userController.googleAuth);
user.get('/auth/google/callback',userController.googleAuthCallback);


//----------------------------signup--------------------

user.get('/signup',userController.signup);

user.post('/signup',userController.signuppost);

//---------------------otp verification------------------

user.get('/otp', userController.otp);

user.post('/otp',userController.otppost);

user.get('/resendotp',userController.otpResend);

//--------------------forgot password-------------------

user.get('/forgotpassword',forgotPassword.forgotPassword);

user.post('/forgotpassword',forgotPassword.forgotPasswordPost);

user.get('/forgotPasswordOtp',forgotPassword.forgotPasswordOtp);

user.post('/forgotPasswordOtp',forgotPassword.forgotPasswordOtpPost);

user.post('/resetPassword',forgotPassword.resetPasswordPost);

user.get('/forgotpassword-resendotp',forgotPassword.forgotResend);

//-----------------------------home-----------------------------

user.get('/home',checkUser, userController.home)

//---------------------------category----------------------------

user.get('/category',checkUser, categoryController.categoryget);

//-----------------------------products----------------------------

user.get('/allproduct',checkUser, categoryController.allProduct);

user.get('/productDetail/:id',checkUser, productController.productDetail);

//------------------------Profile Routes-----------------------

user.get('/profile',activeUser, profileController.profile);

user.post('/update-profile',activeUser, profileController.updateProfile);

user.post('/add-address',activeUser, profileController.addAddress);

user.get('/remove-address/:index',activeUser, profileController.removeAddress);

user.get('/edit-address/:index',activeUser, profileController.editAddress);

user.post('/update-address/:index',activeUser, profileController.updateAddress);

user.get('/ressetprofile-password',activeUser,profileController.ressetPassword);

user.post('/ressetprofile-password',activeUser,profileController.ressetPasswordPost);

//----------------------------------wallet-----------------------------

user.get('/wallet', activeUser , walletController.walletPage);

//------------------------------Cart------------------------------

user.get('/cart',activeUser,cartController.cart);

user.get('/add-to-cart/:id',activeUser,cartController.addToCartPost);

user.delete('/remove-item/:id',activeUser,cartController.removeItem);

user.post('/cart/increment',activeUser,cartController.increment);

user.post('/cart/decrement',activeUser,cartController.decrement);

//----------------------------Wishlist-------------------------

user.get('/wishlist', activeUser, wishlistController.wishlistpage);

user.get('/add-wishlist/:id', activeUser, wishlistController.addWishlist );

user.delete('/delete-wish/:id', activeUser , wishlistController.deleteWishlist );

//-----------------------checkout----------------------

user.get('/checkOut',activeUser,checkoutController.checkout);

user.post('/checkout-address',activeUser,checkoutController.addAddress);

user.post('/place-order/:address/:payment',activeUser,checkoutController.placeOrder);

user.get('/conform-order',activeUser,checkoutController.orderPage);

user.post('/payment-render/:amount',activeUser,checkoutController.paymentRender);

user.post('/applycoupon', activeUser, checkoutController.coupon);

//----------------------Single product order---------------

user.get('/product-checkout/:id',activeUser,singleProductController.checkOut);

user.get('/edit-Address-singlecheckout/:index',activeUser,singleProductController.editAddress);

user.post('/singleOrder/:id/:address/:payment',activeUser,singleProductController.singleOrder);

user.post('/singleCoupon', activeUser , singleProductController.coupon);

//-----------address in checkout--------------

user.get('/removeAddress/:index',activeUser,checkoutController.removeAddress);

user.get('/editAddress/:index',activeUser,checkoutController.editAddress);

user.post('/updateAddress/:index',activeUser,checkoutController.updateAddress);

//-------------------------------order------------------------------

user.get('/orders', activeUser, orderController.orderPage);

user.get('/orderDetail/:id', activeUser, orderController.orderDetails);

user.post('/cancelOrder/:id', activeUser, orderController.cancelOrder);

user.post('/returnOrder', activeUser, orderController.returnOrder);

//-----------------logout--------------------------

user.get('/logout',activeUser,userController.logout);

module.exports = user;  
