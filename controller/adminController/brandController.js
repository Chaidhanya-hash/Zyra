
const mongoose = require('mongoose');
const brandSchema = require('../../model/brandSchema');

//-------------------brand page rendering-----------------------

const brand = async (req,res) =>{
    try {
        const search = req.query.search || ''
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        const brand = await brandSchema.find({brandName: {$regex: search, $options :'i'}})
            .sort({updatedAt : -1})
            .limit(limit)
            .skip((page-1) * limit)

        const count = await brandSchema.countDocuments({brandName:{$regex: search, $options: 'i'}})

        res.render('admin/brand',{
            title:'Brand',
            brand,
            totalPages: Math.ceil(count/limit),
            currentPage: page,
            search,
            limit,
            page
        })


    }
    catch(error){
        console.log(`Error in brand page rendering ${error}`);
    }
}

//--------------------adding new brand --------------------

const addBrandPost = async (req,res) =>{
    try {
        
        const name = req.body.brandName?.trim();
        const brand = {brandName: name, isActive: true};
        const check = await brandSchema.findOne({brandName: {$regex: name,$options: 'i'}});

        if(!check){
            await brandSchema.insertMany(brand)
                .then(()=>{
                    req.flash('success','New Brand added');
                    res.redirect('/admin/brand');
                })
                .catch((error)=>{
                    console.log(`error in adding brand ${error}`);
                })
        } else {
            req.flash('error','Brand already exists');
            res.redirect('/admin/brand');
        }
    }
    catch(error){
        console.log(`error in add brand post ${error}`);
    }
}

//--------------status active or block-----------------

const status = async (req,res) =>{
    try {
        const brandId = req.query.id;
        const status = !(req.query.status === 'true');
        const brand = await brandSchema.findByIdAndUpdate(brandId, {isActive: status})
        res.redirect('/admin/brand');

    }
    catch(error){
        console.log(`error in brand status updating ${error} `);
    }
}

//-----------------------edit brand--------------------

const editBrand = async (req,res) =>{
    
    try {
        const {brandId, brandName} = req.body;
        const editbrand = await brandSchema.findByIdAndUpdate(brandId, {brandName : brandName});
        
        if(editbrand != null){
            req.flash('success','Brand Successfully edited');
            res.redirect('/admin/brand');
        } else {
            req.flash('error','Brand unable to edit');
            res.redirect('/admin/brand');
        }
    }
    catch(error){
        console.log(`error in editing brand ${error}`);
    }
}

module.exports = {
    brand,
    addBrandPost,
    status,
    editBrand
}