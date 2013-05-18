exports.index = function (req, res) {
  res.render('index', {
    title: 'Chatter Graph beta',
    siteUrl: process.env.CHATTER_CALLBACK_URL
  });
};
