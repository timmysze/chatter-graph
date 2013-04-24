
/*
 * GET home page.
 */

exports.auth = function(req, res){
  res.render('index', { title: 'Express' });
};