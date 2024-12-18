const userSchema = require('../model/userSchema');

//---------------------check user is blocked by admin or not--------------------

async function activeUser (req,res,next){
    try {
        if(req.session.user){
            const user = await userSchema.findById(req.session.user);
            if(user.isActive){
                next();
            } else {
                req.session.user = '';
                req.flash('error','User is blocked by admin');
                res.redirect('/login')
            }
        } else {
            res.redirect('/login');
        }
    }
    catch(error) {
        console.log(`error in active user middleware ${error}`);
    }
}



module.exports = activeUser;
    
