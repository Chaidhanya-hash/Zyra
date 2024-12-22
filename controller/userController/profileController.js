const userSchema = require('../../model/userSchema');
const {ObjectId} = require('mongodb');

const bcrypt = require('bcrypt');

const profile = async (req,res)=>{
    try {
        const userId = req.session.user;
        const userDetail = await userSchema.findById(userId);

        if(!userId){
            req.flash('error','User not found please login again');
            return res.redirect('/login')
        }
        if(!userDetail){
            req.flash('error','Profile not found, Please try again later');
            return res.redirect('/home')
        }

        res.render('user/profile',{
            title:'My Profile',
            user:req.session.user,
            userDetail
        })
    }
    catch(error){
        console.log(`error in rendering user profile page ${error}`);
    }
}

const updateProfile = async (req,res)=>{
    try {
        const userName = req.body.userName;
        const phone = req.body.phoneNumber;

        const profileUpdate = await userSchema.findByIdAndUpdate(req.session.user,{name:userName,phone:phone});

        if(profileUpdate){
            req.flash('success','Profile updated successfullly');
        } else {
            req.flash('error','Could not update right now, Please try again later');
        }
        res.redirect('/profile');
    }
    catch(error){
        console.log(`error in update profile post method ${error}`);
    }
}

//------------------Address management in user profile--------------------------

const addAddress = async (req,res) =>{
    try {
        const userAddress = {
            building : req.body.building,
            street : req.body.street,
            city : req.body.city,
            phoneNumber : req.body.phonenumber,
            pincode : req.body.pincode,
            landmark : req.body.landmark,
            state : req.body.state,
            country : req.body.country
        }
        console.log(userAddress);

        const user = await userSchema.findById(req.session.user);

        if(user.address.length >3){
            req.flash('error','Maximum address limit reached');
            return res.redirect('/profile');
        }

        user.address.push(userAddress);

        await user.save();

        req.flash('success','Address added successfully');
        res.redirect('/profile');

    }
    catch(error){
        console.log(`error in adding address in user profile ${error}`);
    }
}

//---------------------remove address--------------------

const removeAddress = async ( req,res) =>{
    try {
        const userId = req.session.user;
        const index = parseInt(req.params.index, 10);

        const user = await userSchema.findById(userId).populate('address');

        if(!user){
            req.flash('error','User not Found');
            return res.redirect('/profile');
        }

        if(isNaN(index) || index < 0 || index >= user.address.length) {
            req.flash('error','Invalid Address');
            return res.redirect('/profile');
        }

        user.address.splice(index,1);
        await user.save();

        req.flash('success','Address deleted Successfully');
        res.redirect('/profile');
    }
    catch(error) {
        console.log(`error in removing address from user profile ${error}`);
        req.flash('error','Failed to delete address, Please try again later');
        res.redirect('/profile');
    }
}

//------------------------edit address page rendering---------------------------

const editAddress = async (req,res) =>{
    const index = Number(req.params.index);
    const id = req.session.user;
    const context = 'Profile';
    try {
        const getAddress = await userSchema.findById({_id : id},{ address: {$slice: [index,1] } });

        if(getAddress){
            res.render('user/editAddress',{
                title:'Edit Address',
                data : getAddress.address[0],
                index,
                user: req.session.user,
                context
            })
        } else {
            res.redirect('/profile');
        }


    }
    catch(error){
        console.log(`error in rendering edit address page ${error}`);
        req.flash('error','error in showing edit address page, Please try again later');
        res.redirect('/profile');
    }
}

//-----------------update existing address-------------------------

const updateAddress = async (req,res) =>{
    const id = req.session.user;
    const index = parseInt(req.params.index, 10);
    const data = {
        building : req.body.building,
        street : req.body.street,
        city : req.body.city,
        state : req.body.state,
        country : req.body.country,
        pincode :req.body.pincode,
        phoneNumber : req.body.phonenumber,
        landmark : req.body.landmark
    }
    try {
        const updateQuery = {};
        updateQuery[`address.${index}`] = data;

        const result = await userSchema.updateOne(
            {_id: new ObjectId(id)},
            {$set : updateQuery}
        );
        req.flash('success','Address updated Successfully');
        res.redirect('/profile');

    }
    catch(error){
        console.log(`error in updating address in user profile ${error}`);
        req.flash('error','Cannot update address right now, PLease try again later');
        res.redirect(`/edit-address/${index}`);
    }
}

const ressetPassword = async (req,res) =>{
    try {
        const user = req.session.user;
        if(!user){
            req.flash('error','User not found please Login again');
            res.redirect('/login');
        }
        res.render('user/passwordProfile',{
            title:'Resset Password',
            user:req.session.user
        })
    } 
    catch (error) {
        console.log(`error in rendering resset password  ${error}`);
    }
}

const ressetPasswordPost = async (req,res) =>{
    try {
        const userId = req.session.user;
        if(!userId){
            req.flash('error','Cannot find user, Please login again');
            res.redirect('/login');
        }

        const password = await bcrypt.hash(req.body.newpassword,10);
        const update = await userSchema.updateOne({_id:userId},{password:password});
        
        if(update) {
            req.flash('success','Password updated Successfully');
            res.redirect('/profile');
        } else {
            req.flash('error','Error in changing Password');
            res.redirect('/profile');
        }

    } 
    catch (error) {
        console.log(`errror in changing password from user profile ${error}`);
    }
}

module.exports = {
    profile,
    updateProfile,
    addAddress,
    removeAddress,
    editAddress,
    updateAddress,
    ressetPassword,
    ressetPasswordPost
}