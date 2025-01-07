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
        

        // Find the best seller
        const productSale = await orderSchema.aggregate([
            { $unwind: "$products" },
            { $group: { _id: '$products.product_id', totalQuantity: { $sum: "$products.product_quantity" } } },
            { $sort: { totalQuantity: -1 } }
        ]);

        const productId = productSale.map(sale => sale._id);

        const products = await productSchema.find({ _id: { $in: productId } });

        const bestProducts = productId.map(id => products.find(product => product._id.toString() === id.toString()));

        const bestCategory = new Map();
        bestProducts.forEach(element => {
            if (element && element.productCategory) {
                if (bestCategory.has(element.productCategory)) {
                    bestCategory.set(element.productCategory, bestCategory.get(element.productCategory) + 1);
                } else {
                    bestCategory.set(element.productCategory, 1);
                }
            }
        });

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
            bestProducts,
            bestCategory,
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