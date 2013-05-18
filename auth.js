var OAuth = require('oauth').OAuth
  , siteURL = process.env.CHATTER_CALLBACK_URL
  , loginURL = "/twitterlogin"
  , callbackURL = "/twittercallback"
  , redirectURL = "/livePlayer";

var makeOAuth = function () {
  // Twitter OAUTH
  var oa = new OAuth('https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    process.env.CHATTER_TWITTER_CONSUMER_KEY,
    process.env.CHATTER_TWITTER_CONSUMER_SECRET,
    '1.0',
    siteURL + callbackURL,
    'HMAC-SHA1');

  return oa;
};

exports.twitterLogin = function (req, res) {
  var oa;
  function getOAuthRequestTokenFunc (error, oauth_token, oauth_token_secret,results) {
    if (error) { return console.log('getOAuthRequestToken Error', error); }
    req.session.callmade = true;
    if (!req.session.oAuthVars) { req.session.oAuthVars = {}; }
    console.log(req.session.oAuthVars);
    req.session.oAuthVars.oauth_token = oauth_token;
    req.session.oAuthVars.oauth_token_secret = oauth_token_secret;
    res.redirect('https://api.twitter.com/oauth/authorize?oauth_token=' + oauth_token);
  }
  //We could store all this in a DB but for another time
  oa = makeOAuth();
  oa.getOAuthRequestToken(getOAuthRequestTokenFunc);
};

exports.twitterCallback = function (req, res, next) {
  if (req.session.hasOwnProperty('callmade')) {
    var oa = makeOAuth();
    oa.getOAuthAccessToken(req.session.oAuthVars.oauth_token
      , req.session.oAuthVars.oauth_token_secret
      , req.param('oauth_verifier')
      , function (error, oauth_access_token,oauth_access_token_secret, tweetRes) {
        if (error) {
          console.log('getOAuthAccessToken error: ', error);
          //do something here UI wise
          return;
        }
        req.session.oAuthVars.oauth_access_token = oauth_access_token;
        req.session.oAuthVars.oauth_access_token_secret = oauth_access_token_secret;
        req.session.oAuthVars.oauth_verifier = req.param('oauth_verifier');
        //
        var obj = {};
        obj.user_id = tweetRes.user_id;
        obj.screen_name = tweetRes.screen_name;
        obj.oauth_access_token = oauth_access_token;
        obj.oauth_access_token_secret = oauth_access_token_secret;
        obj.profile_image_url = tweetRes.profile_image_url;
        //Here we add the 'obj' contain the details to a DB and user this to get the users access details.
        res.redirect(redirectURL);
      });
  }
  else { res.redirect(loginURL); }
};

exports.redirect = function (req, res) {
  //Function to Write the JSON
  res.writeHead(200, 'OK', {'content-type': 'text/json'});
  res.end();
};

exports.makeOAuth = makeOAuth;
exports.siteURL = siteURL;
exports.loginURL = loginURL;
exports.callbackURL = callbackURL;
exports.redirectURL = redirectURL;
