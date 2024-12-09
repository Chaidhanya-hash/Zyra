const productSchema = require('../../model/productSchema');
const categorySchema = require('../../model/categorySchema');

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
//-------------------------products page rendering------------------------

const product = async (req,res) =>{
    try {
        const search = req.query.search || "";
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;

        const products = await productSchema.find({productName: {$regex: search, $options: 'i'}})
            .limit(limit)
            .skip((page - 1) * limit)
            .sort({updatedAt : -1})

        const count = await productSchema.countDocuments({productName: {$regex: search, $options:'i'}})

        res.render('admin/products',{
            products,
            totalPages: Math.ceil(count/limit),
            currentPage: page,
            search,
            limit,
            page
        });
    }
    catch(error){
        console.log(`error in rendering products page `);
    }
}

//----------------add product page rendering----------------

const addProduct = async (req,res) =>{
    try {
        const productCollection = await categorySchema.find()
        
        res.render('admin/addproduct',{
            productCollection
        })
    }
    catch(error){
        console.log(`error in rendering addproduct page ${error}`);
    }
}

//-------------To upload Base64 image to cloudinary-----------------

const uploadBase64ImageToCloudinary = async (base64Data)=>{
    return new Promise((resolve,reject)=>{
        cloudinary.uploader.upload(
            base64Data,
            {folder:"products"},
            (error,result) =>{
                if(error) return reject(error);
                return resolve(result.secure_url);
            }
        )
    })
}


//-------------addproduct post for adding new product----------------

const addProductPost = async (req,res)=>{
    try {
        const imgArray = [];

        for(const img of req.files){
            const imgaeUrl = await uploadBase64ImageToCloudinary(img.path);
            imgArray.push(imgaeUrl);
        }

        const product ={
            productName : req.body.productName,
            productPrice : req.body.productPrice,
            productCategory : req.body.productCollection,
            productQuantity : req.body.productQuantity,
            productDiscount : req.body.productDiscount,
            productDescription : req.body.productDescription,
            productImage : imgArray
        }

        const check = await productSchema.findOne({productName:product.productName, productCategory:product.productCategory});

        if(!check){
            await productSchema.insertMany(product);
            req.flash('success','Product successfully added!')
        } else {
            req.flash('error','Product alreday exists')
        }
        res.redirect('/admin/products');

    }
    catch(error){
        console.log(`error in add product post ${error}`);
        req.flash('error','Failed to add product');
        res.redirect('/admin/addproduct');
    }
}

//--------------------------------Edit Product--------------------------

const editProduct = async (req,res) =>{
    try {
        const id = req.params.id;
        const product = await productSchema.findById(id)
        
        if(product) {
            res.render('admin/editproduct',{
                product
            })
        } else {
            req.flash('error','Unable to edit product')
            res.redirect('/admin/products')
        }
    }
    catch(error){
        console.log(`error in rendering edit product page ${error}`);
    }
}

//-------------------------edit product post method-----------------------

const editProductPost = async (req,res) =>{
    try {
        const id = req.params.id;
        const imageToDelete = JSON.parse(req.body.deletedImages || '[]');
        const croppedImages = JSON.parse(req.body.croppedImages || '[]');

        for (const img of imageToDelete){
            await cloudinary.uploader.destroy(img,(err) =>{
                if(err){
                    console.log(`Error in deleting image from cloudinary ${err}`);
                } else {
                    console.log(`Image deleted successfully from cloudinary`);
                }
            })
        }

        if (imageToDelete.length > 0){
            await productSchema.findByIdAndUpdate(id,{
                $pull: {productImage: {$in: imageToDelete}}
                
            });
        }

        const savedCroppedImages = [];
        for( const img of croppedImages){
            try {
                const cloudinarImageUrl = await uploadBase64ImageToCloudinary(img);
                savedCroppedImages.push(cloudinarImageUrl);
            }
            catch(error){
                console.log(`Error in uploading changed images to cloudinary ${error}`);
            }
        }

        const product = await productSchema.findById(id);

        const newImages = [...product.productImage,...savedCroppedImages];

        await productSchema.findByIdAndUpdate(id,{
            productPrice: req.body.productPrice,
            productQuantity: req.body.productQuantity,
            productDiscount: req.body.productDiscount,
            productDescription: req.body.productDescription,
            productImage: newImages
        });

        req.flash('success','Product Upadated Successfully');
        res.redirect('/admin/products');
    }
    catch(error){
        console.log(`error in edit product post method ${error}`);
        req.flash('error','Could not edit the product');
        res.redirect('/admin/products');
    }
}

//-------------------------------product status-----------------------

const status = async(req,res)=>{
    try {
        const {id,status} = req.query;
        const newStatus = !(status === 'true');
        await productSchema.findByIdAndUpdate(id,{isActive:newStatus})
        res.redirect('/admin/products')
    }
    catch(error){
        console.log(`error while chaging product status ${error}`);
    }
}

//-----------------------------Delete Product------------------------------

const deleteProduct = async (req,res)=>{
    try {
        // const id = req.params.id;
        // const img = await productSchema.findById(id);
        
        // if(!img){
        //     req.flash('error','Product not found!');
        // }

        // const status = !img.isDelete
        // console.log(status);
        // await productSchema.findByIdAndUpdate(id,{isDelete:status})
        // req.flash('success','Product deleted Successfully');
        // res.redirect('/admin/products');
        img.productImage.forEach((ele)=>{
            cloudinary.uploader.destroy(ele,(error)=>{
                if(error){
                    console.log(`error in deleting image with url ${ele}, ${error}`);
                } else {
                    console.log(`image deleted successfully from cloudinary`)
                }
            })
        })

        const product = await productSchema.findByIdAndDelete(id);
        if(!product){
            req.flash('success','Product removed Successfully');
            res.redirect('/admin/products');
        } else {
            req.flash('error','Couldnot remove the product');
            res.redirect('/admin/products');
        }
    }
    catch(error){
        console.log(`error in deleting product ${error}`);
    }
}


module.exports ={
    product,
    addProduct,
    uploadBase64ImageToCloudinary,
    addProductPost,
    deleteProduct,
    editProduct,
    editProductPost,
    status
}