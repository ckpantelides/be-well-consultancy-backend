module.exports = {
    calculateOrderAmount: (booktype) => {
        let amount = '';
        booktype === 'paperback' ? (amount = 1698) : (amount = 2498);
        return amount;
      }
    }