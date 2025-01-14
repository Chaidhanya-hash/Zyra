const categorySchema = require('../../model/categorySchema');
const walletSchema = require('../../model/walletSchema');
const userSchema = require('../../model/userSchema');
//--------------------------wallet page rendering----------------------

const walletPage = async (req,res)=>{
    try{
        const categories = await categorySchema.find();
        const userId = req.session.user;
        const userDetail = await userSchema.findById(userId);
        let wallet = await walletSchema.findOne({ userID: userId })
            .sort({'transaction.transaction_date': -1})
            
        if (!userId) {
            req.flash('error', 'User Not found . Please login again.')
            return res.redirect('/login')
        }
        if(!userDetail){
            req.flash('error','Profile not found, Please try again later');
            return res.redirect('/home')
        }
        if (!wallet) {
            wallet = { balance: 0, transaction: [] };
        } else {
            wallet.transaction.sort((a,b) => b.transaction_date - a.transaction_date);
        }
        res.render('user/wallet',{title:'Wallet' , wallet ,search:'', categories, user:userId, userDetail })
    }catch(error){
        console.log(`error while render user wallet ${error}`)
        res.redirect('/profile')
    }
}

module.exports = { walletPage };