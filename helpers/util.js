module.exports = {
    calculateOrderAmount: (booktype) => {
        let amount = '';
        booktype === 'paperback' ? (amount = process.env.PAPERBACK_PRICE) : (amount = process.env.HARDBACK_PRICE);
        return amount;
      }
    }