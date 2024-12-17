const userSchema = require('../model/userSchema');

//-----------------------Check whether user is login or not ---------------------

async function checkUser (req,res,next) {
    try {
        if(req.session.user){
            const userDetails = await userSchema.findById(req.session.user)
            if(userDetails && userDetails.isActive) {
                next()
            } else {
                req.session.user = ''
                res.redirect('/login');
            }
        } else {
            next();
        }
    }
    catch(error){
        console.log(`error in checkUser middleware ${error}`);
    }

}

module.exports = checkUser
