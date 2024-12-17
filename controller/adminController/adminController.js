


//--------------admin login  get request-----------------

const login = (req,res)=>{
    try {
        if(req.session.admin){
            res.redirect('/admin/dashboard');
        }
        else{
            res.render('admin/login',{
                title:'Admin Login'
            });
        }
        
    }
    catch(error) {
        console.log(`error in admin login ${error}`);
    }
}

//-----------------admin login post request---------------

const loginPost = (req,res)=>{
    try {
        if(req.body.email === process.env.ADMIN_EMAIL && req.body.password === process.env.ADMIN_PASSWORD){
            req.session.admin = req.body.email
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


const logout = async(req,res) =>{
    req.session.destroy((err)=>{
        if(err){
            console.log(`Error while admin logout ${err}`);
        }
        else {
            res.redirect('/admin/login');
        }
    })
}



module.exports = {
    login,
    loginPost,
    logout
}