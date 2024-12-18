const userSchema = require('../../model/userSchema');
const bcrypt = require('bcrypt');
const saltround = 10;

const sendOTP = require('../../services/emailsender');
const generateOTP = require('../../services/generateotp');
const passport = require('passport');
const auth = require('../../services/auth');



const login =((req,res)=>{
    if(req.session.user){
        res.redirect('/home');
    } else {
        res.render('user/login',{
            title:'Login',
            user:req.session.user
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
            } else {
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
            scope:['email','profile']
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
        req.session.otpTime = Date.now();

        req.flash('success','OTP resend successfully');
        res.redirect('/otp');

    }
    catch (error){

    }
}



const home =((req,res)=>{
    res.render('user/homepage',{
        title: 'Home Page',
        user:req.session.user
    });
})

//---------------------logout-----------------------

const logout = async (req,res) =>{
    try {
        req.session.destroy(error =>{
            if(error){
                console.log(`error in logging out user ${error}`);
            }
        })
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
    logout
}