// Allowed origin for protected routes
let whitelist = ['https://ckpantelides.github.io']

module.exports = {
    calculateOrderAmount: (booktype) => {
        let amount = '';
        booktype === 'paperback' ? (amount = 1698) : (amount = 2498);
        return amount;
      },
      corsOptions: {
        origin: function (origin, callback) {
          if (whitelist.indexOf(origin) !== -1) {
            callback(null, true)
          } else {
            callback(new Error('Not allowed by CORS'))
          }
        },
        methods: 'DELETE, POST, GET, OPTIONS, PUT',
        allowedHeaders: 'Content-Type,Authorization,X-Requested-With',
        credentials: true,
        optionsSuccessStatus: 200,
        exposedHeaders:  'Content-Range,X-Content-Range',
        preflightContinue: true,
      }
    }