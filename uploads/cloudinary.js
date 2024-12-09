const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const multer = require('multer');
const {CloudinaryStorage} = require('multer-storage-cloudinary');


dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key:process.env.API_KEY,
    api_secret:process.env.API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder:'product',
        allowed_formats: ['jpg','png','jpeg','webp','gif'],
    },
});

const upload = multer({storage});

module.exports = {cloudinary,upload};