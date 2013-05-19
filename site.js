exports.index = function (req, res) {
  res.render('index', {
    title: 'Chatter Graph beta',
    siteURL: process.env.CHATTER_CALLBACK_URL
  });
};
