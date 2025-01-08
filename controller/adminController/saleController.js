const orderSchema = require('../../model/orderSchema');

const ExcelJS = require('exceljs');
const PDFdocs = require('pdfkit-table')

//---------------rendering sales page--------------------

const salePage = async (req, res) => {
    try {
        // Only count confirmed, shipped, and delivered orders
        const orderCount = await orderSchema.countDocuments({
            orderStatus: { $in: ['Confirmed', 'Shipped', 'Delivered'] }
        });

        // Calculate revenue only from shipped and delivered orders
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

        // Calculate products sold from valid orders
        const product = await orderSchema.aggregate([
            {
                $match: {
                    orderStatus: { $in: ['Confirmed', 'Shipped', 'Delivered'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalQuantity" }
                }
            }
        ]);

        const Revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        const productCount = product.length > 0 ? product[0].total : 0;
        const averageOrderValue = orderCount > 0 ? Revenue / orderCount : 0;

        res.render('admin/salesreport', {
            title: "Sales Report",
            Revenue,
            productCount,
            orderCount,
            averageOrderValue
        });
    } catch (error) {
        console.log(`error while render sale report ${error}`);
        res.status(500).send("Internal Server Error");
    }
};

const getSalesByMonth = async (req, res) => {
    try {
        const sales = await orderSchema.aggregate([
            { 
                $match: { 
                    orderStatus: { $in: ['Confirmed', 'Delivered', 'Shipped'] } 
                } 
            },
            {
                $group: {
                    _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } },
                    totalSales: { 
                        $sum: {
                            $cond: [
                                { $in: ["$orderStatus", ["Shipped", "Delivered"]] },
                                "$totalPrice",
                                0
                            ]
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);
        res.json(sales);
    } catch (error) {
        console.log(`error in get sales by month ${error}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getOrderDetails = async (req, res) => {
    let { startDate, endDate, salesreportType, page = 1, limit = 5 } = req.body;
    page = parseInt(page);
    limit = parseInt(limit);
    let skip = (page - 1) * limit;

    try {
        let match = {
            orderStatus: { $in: ['Confirmed', 'Shipped', 'Delivered'] }
        };

        const now = new Date();
        if (salesreportType === 'custom') {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            match.createdAt = { $gte: start, $lte: end };
        } else if (salesreportType === 'monthly') {
            match.createdAt = { 
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                $lte: now 
            };
        } else if (salesreportType === 'yearly') {
            match.createdAt = { 
                $gte: new Date(now.getFullYear(), 0, 1),
                $lte: now 
            };
        } else if (salesreportType === 'weekly') {
            const diff = now.getDate() - now.getDay();
            match.createdAt = { 
                $gte: new Date(now.setDate(diff)),
                $lte: new Date() 
            };
        }

        const [orderDetails, totalRecords] = await Promise.all([
            orderSchema.aggregate([
                { $match: match },
                {
                    $lookup: {
                        from: 'coupons',
                        localField: 'coupen_id',
                        foreignField: '_id',
                        as: 'coupen_data'
                    }
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]),
            orderSchema.countDocuments(match)
        ]);

        const totalPages = Math.ceil(totalRecords / limit);
        
        res.status(200).json({ 
            orderDetails, 
            totalPages, 
            currentPage: page,
            totalRecords
        });
    } catch (error) {
        console.log(`error while render the order details ${error}`);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

//---------------------pdf-------------------------------------

const downloadPDF = async (req, res) => {
    const { salesreportType, startDate, endDate, reportType } = req.body;
    let match = {
        // Add status filter to exclude cancelled and returned orders
        orderStatus: { $in: ['Confirmed', 'Shipped', 'Delivered'] }
    };

    if (salesreportType !== "") {
        match.createdAt = { 
            $lte: new Date(endDate), 
            $gte: new Date(startDate) 
        };
    }

    try {
        let orderDetails = await orderSchema.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'coupons',
                    localField: 'coupen_id',
                    foreignField: '_id',
                    as: 'coupen_data'
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        if (orderDetails.length > 0) {
            if(reportType === 'PDF') {
                await generatePdf(orderDetails, res);
            } else if(reportType === 'EXCEL') {
                await generateExcel(orderDetails, res);
            }
        } else {
            res.status(404).json({ message: "No orders found for the specified period." });
        }
    } catch (error) {
        console.log(`error while download pdf ${error}`);
        res.status(500).json({ message: error.message });
    }
}

async function generatePdf(orders, res) {
    // Calculate totals only from valid orders
    const totalOrders = orders.length;
    const totalRevenue = orders
        .filter(order => ['Shipped', 'Delivered'].includes(order.orderStatus))
        .reduce((acc, curr) => acc + curr.totalPrice, 0);

    const doc = new PDFdocs();
    const filename = 'sales-report.pdf';

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    // Header
    doc.fontSize(24).text('Zyra Skincare', 50, 50)
        .fontSize(10)
        .text('Sulthan Bathery', 50, 80)
        .text(' Wayanad, 673592', 50, 95)
        .fontSize(20)
        .text('Sales Report', 250, 50, { align: 'center' })
        .fontSize(10)
        .text('Generated on:', 400, 50, { align: 'right' })
        .text(new Date().toLocaleDateString(), 400, 65, { align: 'right' });

    // Summary
    doc.roundedRect(50, 120, 500, 60, 10).stroke();
    doc.fontSize(12).text('Summary', 60, 130);
    doc.fontSize(10)
        .text(`Total Orders: ${totalOrders}`, 60, 150)
        .text(`Total Revenue: Rs ${totalRevenue.toFixed(2)}`, 300, 150);

    // Table
    doc.moveDown(2);
    const tableTop = 200;
    doc.font("Helvetica-Bold").fontSize(10);
    
    // Table headers
    ['Order Id', 'Address', 'Payment Method', 'Order Status', 'Total'].forEach((header, i) => {
        doc.text(header, 50 + i * 100, tableTop);
    });

    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).stroke();

    // Table rows
    let y = tableTop + 30;
    orders.forEach((order, index) => {
        doc.font("Helvetica").fontSize(8);
        doc.text(order.order_id, 50, y);
        doc.text(order.address.building + '\n' + order.address.street + ' ' + order.address.city + "\n" + "Pincode: " + order.address.pincode, 150, y, { width: 100 });
        doc.text(order.paymentMethod, 250, y);
        doc.text(order.orderStatus, 350, y);
        doc.text('Rs ' + order.totalPrice.toFixed(2), 450, y);

        y += 40;
        if (y > 700) {
            doc.addPage();
            y = 50;
        }
    });

    doc.end();
}

//------------------------------Excel---------------------------

async function generateExcel(orders, res) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Set column headers and widths
    worksheet.columns = [
        { header: "Order ID", key: "orderId", width: 15 },
        { header: "Address", key: "address", width: 30 },
        { header: "Pincode", key: "pin", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Order Date", key: "orderDate", width: 18 },
        { header: "Total", key: "total", width: 15 },
    ];

    // Calculate totals only from shipped and delivered orders
    let totalSale = orders
        .filter(order => ['Shipped', 'Delivered'].includes(order.orderStatus))
        .reduce((acc, curr) => acc + curr.totalPrice, 0);
    let totalOrders = orders.length;

    // Add data rows
    for (const order of orders) {
        worksheet.addRow({
            orderId: order.order_id,
            address: `${order.address.building}, ${order.address.street}, ${order.address.city}`,
            pin: order.address.pincode,
            status: order.orderStatus,
            orderDate: new Date(order.createdAt).toLocaleDateString(),
            total: order.totalPrice.toFixed(2)
        });
    }

    // Add summary row
    worksheet.addRow({});  // Empty row for spacing
    worksheet.addRow({
        orderId: "Summary",
        address: "",
        pin: "",
        status: `Total Orders: ${totalOrders}`,
        orderDate: "Total Revenue:",
        total: `Rs ${totalSale.toFixed(2)}`
    });

    // Style the summary row
    const summaryRow = worksheet.lastRow;
    summaryRow.eachCell((cell) => {
        cell.font = { bold: true };
    });

    // Generate and send the Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    const excelBuffer = Buffer.from(buffer);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");
    res.send(excelBuffer);
}

module.exports = {
    salePage,
    getSalesByMonth,
    generateExcel,
    downloadPDF,
    getOrderDetails
}