const userSchema = require('../../model/userSchema');

const generateOTP = require('../../services/generateotp');
const sendOTP = require('../../services/emailsender');

const bcrypt = require('bcrypt');


//-----------------forgot password email page rendering------------------

const forgotPassword = (req,res)=>{
    try {
        req.session.user = ''
        res.render('user/forgotpassword',{
            title:'Forgot Password',
            user:req.session.user,
            search : ''
        })
    }
    catch(error) {
        console.log(`Error in forgot password page rendering ${error}`);
    }
}

//-------------forgot password email page post method-----------------------

const forgotPasswordPost = async (req,res) =>{
    try {
        const checkEmail = await userSchema.findOne({email:req.body.email});

        if(!checkEmail){
            req.flash('error','Sorry we cannot find you please Signup');
            return res.redirect('/signup');
        }

        if(!checkEmail.isActive){
            req.flash('error','Access to this account is denied by Admin');
            return res.redirect('/login');
        }

        const OTP = generateOTP();
        
        sendOTP(req.body.email,OTP);

        req.session.email = req.body.email;
        req.session.otp = OTP;
        req.session.otptimer = Date.now();
        
        req.flash('success', `OTP sent to ${req.body.email}`);
        return res.redirect('/forgotPasswordOtp');

    }
    catch(error){
        console.log(`error in forget password post method ${error}`);
        
    }
}

//-------------------------OTP page rendering--------------------------

const forgotPasswordOtp = async (req,res)=>{
    try {
        res.render('user/forgotPasswordOtp',{
            title:'Forget Password OTP',
            email:req.session.email,
            search : '',
            otpTime:req.session.otptimer,
            user:req.session.user,
            
        })
    }
    catch(error){
        console.log(`error in rendering otp page for forget password ${error}`);
    }
}

const forgotPasswordOtpPost = async (req,res)=>{
    try {
        if(req.session.otp === req.body.otp){
            res.render('user/resetPassword',{
                title:'Reset Password',
                user:req.session.user,
                search : ''
            })
        } else {
            req.flash('error','Invalid OTP');
            res.redirect('/forgotPasswordOtp')
        }
    }
    catch(error){
        console.log(`error in forget password OTP post method ${error}`);
    }
}

const resetPasswordPost = async (req,res) =>{
    try {
        const password = await bcrypt.hash(req.body.password,10);
        const update = await userSchema.updateOne({email:req.session.email},{password:password});

        if(update) {
            req.flash('success','Password updated Successfully');
            res.redirect('/login');
        } else {
            req.flash('error','Error in changing Password');
            res.redirect('/login');
        }
    }
    catch(error){
        console.log(`error in reset password post method ${error}`);
    }
}

const forgotResend = async (req,res)=>{
    try {
        const email = req.session.email;
        const otp = generateOTP();
        sendOTP(email,otp);

        req.session.otp = otp;
        req.session.otptimer = Date.now();

        req.flash('success','New otp has send to your Email');
        res.redirect('/forgotPasswordOtp');
    }
    catch(error) {
        console.log(`error in resend otp forgot password ${error}`);
    }
}

module.exports = {
    forgotPassword,
    forgotPasswordPost,
    forgotPasswordOtp,
    forgotPasswordOtpPost,
    resetPasswordPost,
    forgotResend
}