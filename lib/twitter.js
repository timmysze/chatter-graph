/*

Interface for tweets and Twitter stream.

*/

var auth = require('./auth')
  , oa = auth.makeOAuth()
  , accountURL = 'https://api.twitter.com/1.1/account/settings.json'
  , searchURL = 'https://api.twitter.com/1.1/search/tweets.json';

var Firehose = function (sess, q) {
  this.session = sess;
  this.query = q;
};

Firehose.prototype.account = function (callback) {
  if (!this.session) { console.log('ERROR: Need to set the session.'); }

  oa.getProtectedResource(accountURL, 'GET'
  , this.session.oAuthVars.oauth_access_token
  , this.session.oAuthVars.oauth_access_token_secret
  , callback);
};

var makeSearchURL = function (opt) {
  if (!this.query) { console.log('ERROR: Need to set the query.'); }
  return searchURL + '?&count=100&result_type=recent&q=' + this.query + '&' + opt;
};

Firehose.prototype.search = function (callback, opt) {
  var url = makeSearchURL(opt);

  if (!this.session) { console.log('ERROR: Need to set the session.'); }

  oa.getProtectedResource(url, 'GET'
      , this.session.oAuthVars.oauth_access_token
      , this.session.oAuthVars.oauth_access_token_secret
      , callback);
};

exports.Firehose = Firehose;
