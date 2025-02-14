const userSchema = require('../../model/userSchema');
const bcrypt = require('bcrypt');
const saltround = 10;

const sendOTP = require('../../services/emailsender');
const generateOTP = require('../../services/generateotp');
const passport = require('passport');
const auth = require('../../services/auth');
const productSchema = require('../../model/productSchema');
const wishlistSchema = require('../../model/wishlistSchema');
const categorySchema = require('../../model/categorySchema');
const brandSchema = require('../../model/brandSchema');



const login =((req,res)=>{
    if(req.session.user){
        res.redirect('/home');
    } else {
        res.render('user/login',{
            title:'Login',
            user:req.session.user,
            search : ''
        });
    }
    
})

const loginPost = async (req,res)=>{
    try {
        const test = await userSchema.findOne({email:req.body.email});

        if(test){
            if(!test.isActive){
                req.flash('error','User is blocked by admin');
                res.redirect('/login');
            } 

            else if(test.googleID){
                req.flash('error','You are logged in by using google. Please use Google to login again');
                res.redirect('/login');
            }
            else {
                const password = await bcrypt.compare(req.body.password,test.password);
                if(password){
                    req.session.user = test.id
                    res.redirect('/home');
                } else {
                    req.flash('error','Invalid email Id or password');
                    res.redirect('/login')
                }
            }
            
            
        } else {
            req.flash('error','Couldnot find user, please login again');
            res.redirect('/login');
        }
        
    }
    catch (error){
        console.log(`error in user login post ${error}`);
    }
}

//--------------------google login----------------

const googleAuth = (req,res)=>{
    try {
        passport.authenticate('google',{
            scope:['email','profile'],
            prompt: 'consent',
            access_type: 'offline'
        })(req,res)
    }
    catch(error){
        console.log(`error in user google login ${error}`);
    }
}


//----------------google auth callback-------------

const googleAuthCallback = (req,res,next)=>{
    try {
        passport.authenticate('google',(err,user,info)=>{
            if(err){
                console.log(`error on google auth callback ${err}`);
            }
            if(!user){
                req.flash('error','User not found please signup or try again');
                return res.redirect('/login');
            }
            else if(!user.isActive){
                req.flash('error','User access is blocked by admin');
            }
            
            req.login(user,(err)=>{
                if(err){
                    return next(err);
                }
                req.session.user = user.id;
                return res.redirect('/home');
            })
        })(req,res,next);
    }
    catch(error){
        console.log(`Error on google callback ${error}`);
    }
}

//---------signup page render---------------------


const signup =((req,res)=>{
    res.render('user/signup',{
        title:'Signup',
        search : '',
        user:req.session.user
    });
})


//-------------Getting details of user from signup page ---------------------


const signuppost =async (req,res)=>{
    try{
        const details = {
            name:req.body.name,
            email:req.body.email,
            password: await bcrypt.hash(req.body.password,saltround),
            phone:req.body.phone

        }
        const check = await userSchema.findOne({email:details.email})
        //console.log(check);
        if(check){
            console.log('User already exists')
            req.flash('error','User already exists');
            res.redirect('/signup');
        } else{
            const OTP = generateOTP();
            console.log(OTP);
            sendOTP(details.email,OTP);
            req.flash('success',`OTP send to the ${details.email}`);

            req.session.otp = OTP;
            req.session.otptime = Date.now();
            req.session.email = details.email;
            req.session.name = details.name;
            req.session.phone = details.phone;
            req.session.password = details.password;

            res.redirect('/otp');    
            
        }
        //console.log(details);
        
    }catch(error){
        console.log(`error in user signup post ${error}`);
    }
}

//------------------otp page render----------------
const otp =(req,res)=>{
    try{
        res.render('user/otppage',{
            title: 'OTP verify',
            user:req.session.user,
            email: req.session.email,
            otpTime: req.session.otptime,

        });
        
    }
    catch(error){
        console.log(`error while rendering OTP page ${error}`);
    }
    
}


//---------------geting otp from user---------------
const otppost = async (req,res)=>{
    try{
        const details={
            name: req.session.name,
            email: req.session.email,
            password: req.session.password,
            phone: req.session.phone
        }
        //console.log(details);
        if(req.session.otp === req.body.otp){
            console.log('otp verified');
            await userSchema
             .insertMany(details)
             .then(()=>{
                 console.log('new user registered successfully');
                 req.flash('success','User signup successfull');
                 res.redirect('/login');
          })
          .catch((err)=>{
            console.log(`error while user signup ${err}`);
          })

        } else {
            req.flash('error','Invald OTP');
            res.redirect('/otp');
        }
    }
    catch (error){
        console.log(`error while getting otp ${error}`);
    }

}

//-------------------Resend Otp--------------------------

const otpResend = (req,res)=>{
    try {
        const email = req.session.email;
        const OTP = generateOTP();
        sendOTP(email,OTP);

        req.session.otp = OTP;
        req.session.otptime = Date.now();

        req.flash('success','OTP resend successfully');
        res.redirect('/otp');

    }
    catch (error){
        console.log(`Error in OTP resend: ${error}`);
        req.flash('error', 'Failed to resend OTP');
        res.redirect('/otp');
    }
}

//-----------rendering home page--------------------

const home = async (req, res) => {
    try {
        const userId = req.session.user;
        const search = req.query.search || '';

        // Get active brands and categories
        const [activeBrands, activeCategories] = await Promise.all([
            brandSchema.find({ isActive: true }),
            categorySchema.find({ isActive: true })
        ]);

        // Get IDs of active brands and category names
        const activeBrandIds = activeBrands.map(brand => brand._id);
        const activeCategoryNames = activeCategories.map(cat => cat.categoryName);

        // Get products that are active AND belong to active brands AND active categories
        const product = await productSchema.find({
            isActive: true,
            productBrand: { $in: activeBrandIds },
            productCategory: { $in: activeCategoryNames }
        })
        .limit(8)
        .sort({ createdAt: -1 });

        // Get wishlist if user is logged in
        const wishlist = await wishlistSchema.findOne({ userID: userId });

        res.render('user/homepage', {
            title: 'Home Page',
            search,
            product,
            brand: activeBrands,
            wishlist,
            categories: activeCategories, // Only passing active categories
            user: req.session.user
        });
    } catch (error) {
        console.log(`error in rendering home page ${error}`);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Something went wrong',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

//----------------rendering brand products page--------------

const getBrandProducts = async (req, res) => {
    try {
        const userId = req.session.user;
        const brandId = req.params.id;

        // Check if brand exists and is active
        const brand = await brandSchema.findOne({ 
            _id: brandId,
            isActive: true 
        });

        if (!brand) {
            req.flash('error', 'Brand not found or inactive');
            return res.redirect('/home');
        }

        // Get active categories
        const activeCategories = await categorySchema.find({ isActive: true });
        const activeCategoryNames = activeCategories.map(cat => cat.categoryName);

        // Get products that are active AND belong to active categories
        const products = await productSchema.find({
            productBrand: brand._id,
            isActive: true,
            productCategory: { $in: activeCategoryNames }
        });

        // if (!products || products.length === 0) {
        //     req.flash('error', 'No products found for this brand');
        //     return res.redirect('/home');
        // }

        const wishlist = await wishlistSchema.findOne({ userID: userId });

        res.render('user/brand-products', {
            title: brand.brandName,
            products,
            user: req.session.user,
            search: '',
            wishlist
        });
    } catch (error) {
        console.log(`Error in brand products page rendering: ${error}`);
        req.flash('error', 'Something went wrong');
        res.redirect('/home');
    }
};

//---------------------logout-----------------------

const logout = async (req,res) =>{
    try {
        req.session.destroy(error =>{
            if(error){
                console.log(`error in logging out user ${error}`);
            }
        })
        res.redirect('/home');
    }
    catch(error){
        console.log(`error in user logout ${error}`);
    }
}

module.exports ={
    login,
    googleAuth,
    googleAuthCallback,
    signup,
    signuppost,
    otp,
    otppost,
    otpResend,
    loginPost,
    home,
    getBrandProducts,
    logout
}