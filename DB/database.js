const mongoose = require('mongoose');




const connectDB = async () =>{
    try {
        await mongoose.connect('mongodb://localhost:27017/Zyra',{})
        console.log(`MongoDB Connected `);
    }
    catch (error){
        console.log(error);
        
    }
}


module.exports = connectDB;