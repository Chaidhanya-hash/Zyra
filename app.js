const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const passport = require('passport');
const port = 3000;
const userRoutes = require('./routes/userRoutes'); 
const adminRoutes = require('./routes/adminRoutes');
//const {signuppost} =require('./controller/userController/userController');

const connectDB = require('./DB/database');

connectDB();



//-------------------Setting View engine---------------------
app.set('view engine', 'ejs');


//--------------------Serving Static Files---------------------


app.use('/styles', express.static(path.join(__dirname, 'styles')));


//--------------------url encoded data--------------------------

app.use(express.json());
app.use(express.urlencoded({extended:true}));

//--------------------middlewares---------------------------------

app.use(session({
    secret:'my-secret-key',
    resave:false,
    saveUninitialized: false
}))

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

//---------------------------layouts----------------------------

app.use(expressLayouts);
app.set('layout','./layouts/layout')

//---------------------------flash message-------------------------

app.use((req,res,next)=>{

    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();

})


//-----------routes--------------------

app.use('/', userRoutes);  
app.use('/admin', adminRoutes);


app.get('/',(req,res)=>{
    try{
        res.redirect('/home');
    }
    catch(err){
        console.log(`Error occured ${err}`);
    }
})



//-------------Server Listening---------------


app.listen(port,(err)=>{
    if(err){
        console.log(err);
    }
    else{
        console.log(`server is running in ${port}`)
    }
});


//-------------Server Listening---------------