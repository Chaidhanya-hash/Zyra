


//--------------admin login  get request-----------------

const login = (req,res)=>{
    try {
        res.render('admin/login');
    }
    catch(error) {
        console.log(`error in admin login ${error}`);
    }
}

//-----------------admin login post request---------------

const loginPost = (req,res)=>{
    try {
        if(req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASSWORD){
            res.redirect('/admin/dashboard');
        } else {
            req.flash('error','Invalid Credentials');
            res.redirect('/admin/login');
        }
    }
    catch(error){
        console.log(`error from login post ${error}`);
    }
}






module.exports = {
    login,
    loginPost
}