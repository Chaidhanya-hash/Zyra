const categorySchema = require('../../model/categorySchema');

const mongoose = require('mongoose');

//---------------------------category page rendering----------------------

const category = async (req,res) =>{
    try {
        const search = req.query.search || ''
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        const category = await categorySchema.find({categoryName: {$regex: search, $options :'i'}})
            .sort({updatedAt : -1})
            .limit(limit)
            .skip((page-1) * limit)

        const count = await categorySchema.countDocuments({categoryName:{$regex: search, $options: 'i'}})

        res.render('admin/category',{
            title:'Category',
            category,
            totalPages: Math.ceil(count/limit),
            currentPage: page,
            search,
            limit,
            page
        })


    }
    catch(error){
        console.log(`Error in category page rendering ${error}`);
    }
}

//----------------------------adding new category-------------------------

const addCategoryPost = async (req,res) =>{
    try {
        
        const name = req.body.categoryName;
        const category = {categoryName: name, isActive: true};
        const check = await categorySchema.findOne({categoryName: {$regex: name,$options: 'i'}});

        if(!check){
            await categorySchema.insertMany(category)
                .then(()=>{
                    req.flash('success','New category added');
                    res.redirect('/admin/category');
                })
                .catch((error)=>{
                    console.log(`error in adding category ${error}`);
                })
        } else {
            req.flash('error','Category already exists');
            res.redirect('/admin/category');
        }
    }
    catch(error){
        console.log(`error in add category post ${error}`);
    }
}

//---------------------------Active or Block----------------------

const status = async (req,res) =>{
    try {
        const categoryId = req.query.id;
        const status = !(req.query.status === 'true');
        const category = await categorySchema.findByIdAndUpdate(categoryId, {isActive: status})
        res.redirect('/admin/category');

    }
    catch(error){
        console.log(`error in category status updating ${error} `);
    }
}

//------------------------Edit Category------------------------

const editCategory = async (req,res) =>{
    
    try {
        const {categoryId, categoryName} = req.body;
        console.log(categoryId);
        const editCategory = await categorySchema.findByIdAndUpdate(categoryId, {categoryName : categoryName});
        
        if(editCategory != null){
            req.flash('success','Category Successfully edited');
            res.redirect('/admin/category');
        } else {
            req.flash('error','Category unable to edit');
            res.redirect('/admin/category');
        }
    }
    catch(error){
        console.log(`error in editing category ${error}`);
    }
}



module.exports = {
    category,
    addCategoryPost,
    status,
    editCategory
}