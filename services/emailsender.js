const nodemailer = require('nodemailer');
require('dotenv').config();


const transporter = nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:process.env.SMTP_PORT,
    secure:false,
    auth: {
        user:process.env.MAIL,
        pass:process.env.PASS
    }
})

function sendOTP(email,OTP){
    const inMail ={
        from:"Zyra",
        to:email,
        subject:"Verification code from Zyra Skincare",
        text:`Enter the One Time Password ${OTP} to verify your account`
    }

    transporter.sendMail(inMail,(err,info)=>{
        if(err){
            console.log(`Error while sending mail ${err}`);
        }
        else{
            console.log(`Email sent successfully`);
        }
    })

}

module.exports = sendOTP;