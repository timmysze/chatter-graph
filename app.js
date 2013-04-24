
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var OAuth = require('oauth').OAuth

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session());
app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

function makeOAuth() {
  //twitter oAuth.
  var oa = new OAuth('https://api.twitter.com/oauth/request_token',
  'https://api.twitter.com/oauth/access_token',
  process.env.CHATTER_TWITTER_CONSUMER_KEY,
  process.env.CHATTER_TWITTER_CONSUMER_SECRET,
  '1.0',
  "http://127.0.0.1:3000/auth/twitter/callback",
  'HMAC-SHA1');
  return oa;
}

app.get('/auth/twitter', function(req, res) {
  var oa;
  function getOAuthRequestTokenFunc(error, oauth_token, oauth_token_secret,results) {
    if (error) return console.log('getOAuthRequestToken Error', error);
    req.session.callmade = true;
    req.session.oAuthVars = {};
    req.session.oAuthVars.oauth_token = oauth_token;
    req.session.oAuthVars.oauth_token_secret = oauth_token_secret;
    res.redirect('https://api.twitter.com/oauth/authorize?oauth_token=' + oauth_token);
  }
  //We could store all this in a DB but for another time
  oa = makeOAuth();
  oa.getOAuthRequestToken(getOAuthRequestTokenFunc);
});

app.get('/auth/twitter/callback', function(req, res, next) {
  if (req.session.hasOwnProperty('callmade')) {
    var oa = makeOAuth();
    oa.getOAuthAccessToken(req.session.oAuthVars.oauth_token, req.session.oAuthVars.oauth_token_secret, req.param('oauth_verifier'),
    function(error, oauth_access_token,oauth_access_token_secret, tweetRes) {
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
    res.redirect('/search');
    });
  }
  else {
    res.redirect('twitterlogin');
  }
});

app.get('/search', function(req, res) {
  //Function to Write the JSON
  function writeRes(arg) {
    res.writeHead(200, 'OK', {'content-type': 'text/json'});
    res.write('{"arr":' + arg + '}');
    res.end();
  }
  if (req.session.hasOwnProperty('oAuthVars')) {
    //Set it up.
    var oa = makeOAuth();
    //Two Steps. 1. Get the IDs and then 2 use the IDs to get the details.
    // 1. Get the IDs of a user is following.
    oa.getProtectedResource('https://api.twitter.com/1.1/search/tweets.json?q=boston&count=100', 'GET', req.session.oAuthVars.oauth_access_token, req.session.oAuthVars.oauth_access_token_secret,
    function(error, data, response) {
      var arrData;
      if (error) {
        console.log('error', error);
        writeRes('');
      }
      else {
        //2. Get their IDs to their Details.... this can be pretty big.. Here we'll just take what we need...
        arrData = JSON.parse(data);
        console.log(arrData);
        var output = [];
        for (var i = 0, l = arrData.statuses.length; i < l; i++){
          output.push(arrData.statuses[i].text);
        }
        writeRes(JSON.stringify(output));
      }
    });
  }
  else {
  writeRes('you are not logged in... handle on front end');
  }
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
