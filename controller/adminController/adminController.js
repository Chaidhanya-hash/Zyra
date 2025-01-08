const orderSchema = require('../../model/orderSchema')
const productSchema = require('../../model/productSchema')
const userSchema = require('../../model/userSchema')


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


//-------------------dashboard page rendering----------------------

const dashboard = async (req, res) => {
    try {
        const orderCount = await orderSchema.countDocuments();
        const userCount = await userSchema.countDocuments();

        const revenueResult = await orderSchema.aggregate([
            {
                $match: {
                    orderStatus: { $in: ['Shipped', 'Delivered'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalPrice" }
                }
            }
        ]);
        const Revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        const product = await orderSchema.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalQuantity" }
                }
            }
        ]);
        const productCount = product.length > 0 ? product[0].total : 0;
        // const productCount = await orderSchema.find({
        //     orderStatus: { $in: ['Pending', 'Shipped', 'Delivered'] }
        // }).count();

        // Find the best selling products with complete information in one aggregation
        const bestSellingProducts = await orderSchema.aggregate([
            // Unwind products array
            { $unwind: "$products" },
            // Only include completed orders
            {
                $match: {
                    orderStatus: { $in: ['Confirmed','Shipped', 'Delivered'] }
                }
            },
            // Group by product ID and calculate total quantities and revenue
            {
                $group: {
                    _id: '$products.product_id',
                    totalQuantity: { $sum: "$products.product_quantity" },
                    totalRevenue: { $sum: { $multiply: ["$products.product_quantity", "$products.product_price"] } },
                    productName: { $first: "$products.product_name" }
                }
            },
            // Sort by quantity sold
            { $sort: { totalQuantity: -1 } },
            // Limit to top 10 products
            { $limit: 10 },
            // Lookup product details
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: "$productDetails" },
            // Project final fields
            {
                $project: {
                    _id: 1,
                    productName: "$productDetails.productName",
                    productImage: { $first: "$productDetails.productImage" },
                    productCategory: "$productDetails.productCategory",
                    productBrand: "$productDetails.productBrand",
                    totalQuantity: 1,
                    totalRevenue: 1,
                    averagePrice: { $divide: ["$totalRevenue", "$totalQuantity"] }
                }
            }
        ]);

        // Calculate best categories from the best selling products
        const bestCategory = new Map();
        bestSellingProducts.forEach(product => {
            if (product.productCategory) {
                bestCategory.set(
                    product.productCategory,
                    (bestCategory.get(product.productCategory) || 0) + product.totalQuantity
                );
            }
        });

        // Sort categories by total quantity sold
        const sortedCategories = Array.from(bestCategory.entries())
            .sort((a, b) => b[1] - a[1]);

        const brandAnalytics = await orderSchema.aggregate([
            { $unwind: "$products" },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: "$productInfo" },
            {
                $lookup: {
                    from: 'brands',
                    localField: 'productInfo.productBrand',
                    foreignField: '_id',
                    as: 'brandInfo'
                }
            },
            { $unwind: "$brandInfo" },
            {
                $group: {
                    _id: '$brandInfo._id',
                    brandName: { $first: '$brandInfo.brandName' },
                    totalSales: { $sum: "$products.product_price" },
                    totalQuantity: { $sum: "$products.product_quantity" },
                    averagePrice: { $avg: "$products.product_price" }
                }
            },
            { $sort: { totalSales: -1 } }
        ]);

        res.render('admin/dashboard', {
            title: "Dashboard",
            orderCount,
            userCount,
            Revenue,
            productCount,
            bestSellingProducts,
            bestCategory: sortedCategories,
            brandAnalytics
        });
    } catch (error) {
        console.log(`error from home ${error}`);
    }
};

const salesChart = async (req,res)=>{
    try {
        const orders = await orderSchema.find({
            orderStatus: { $in: ['Pending','Shipped','Delivered'] }
        });

        let salesData = Array.from({ length: 12 }, () => 0);
        let revenueData = Array.from({ length: 12 }, () => 0);
        let productsData = Array.from({ length: 12 }, () => 0);

        orders.forEach(order => {
            const month = order.createdAt.getMonth();
            revenueData[month] += order.totalPrice;
            for(product of order.products){
                productsData[month] += order.totalQuantity;
            }
        });

        const Orders = await orderSchema.find({})

        Orders.forEach(order => {
            const month = order.createdAt.getMonth();
            salesData[month]++
        })

        res.json({
            salesData,
            revenueData,
            productsData
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


//----------------logout---------------------------

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
    logout,
    dashboard,
    salesChart
}