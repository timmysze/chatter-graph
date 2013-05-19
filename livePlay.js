// console.log = function () {};

var auth = require('./auth')
  , oa = auth.makeOAuth()
  , moment = require('moment')
  // , tweetRecID = null
  // , tweetRecTime = null
  // , tapeStart = null
  , bufferMin = 1
  , recordRateSecs = 7
  , tapeDeck
  , secsPerBar = 1
  , scale = 1
  // , tape = []
  // , denFn = []
  // , cmdFn = []
  , stop = false
  // , socket
  // , query = 'FML'
  // , session
  , reel
  ;



exports.index = function (req, res) {
  res.render('liveplayer', { siteURL: process.env.CHATTER_CALLBACK_URL });
};

exports.shutDown = function () {
  // TODO: refactor to telling the reel something
  clearInterval(tapeDeck);
};

exports.startNewRecording = function (sock, sess, q, stamp) {
  // QUESTION: do I need this?
  if (!sess.hasOwnProperty('oAuthVars')) { return; }

  reel = new require('./lib/reel').Reel(sock, sess, q, stamp);
  reel.sendHeader();
  recordBuffer(reel);
};

var getTweets = function (url, callback) {
  oa.getProtectedResource(url, 'GET'
      , session.oAuthVars.oauth_access_token
      , session.oAuthVars.oauth_access_token_secret
      , callback);
};

var formatTweet = function (tweetObj) {
  var tweet = {};
  tweet.created_at = moment(tweetObj.created_at).utc().format();
  console.log(tweet.created_at);
  tweet.twitterID = tweetObj.id_str;
  tweet.text = tweetObj.text;
  tweet.screenName = tweetObj.user.screen_name;
  // tweet.userID = tweetObj.user.id_str;
  // tweet.userName = tweetObj.user.name;
  // tweet.location = tweetObj.user.location;
  // tweet.entities = tweetObj.entities;
  return tweet;
};

var calcScale = function (array) {
  var safety = 0.6
    , maxUnits = 100
    , maxScale = 30
    , maxVal;

  maxVal = array.reduce(function (prev, curr) {
    return Math.max(prev, curr);
  }, 1);

  return Math.min(maxScale, Math.floor(maxUnits / maxVal * safety));
};

var recordBuffer = function (reel, max_id) {
  var buffer = []
    , bufferFull = false
    , denFn = []
    , lastOffset = 0
    , currOffset = 0;

  var tweetStream;


  var url = 'https://api.twitter.com/1.1/search/tweets.json?' +
            'q=' + reel.query + '&count=100' + '&result_type=recent';

  if (max_id) { url += '&max_id=' + max_id; }

  getTweets(url, function (error, data, response) {
    tweetStream = JSON.parse(data).statuses;
    max_id = tweetStream[tweetStream.length-1].id_str;

    tweetStream.forEach(function (element, index) {
      reel.addToBuffer(element);
    });

    if (!reel.bufferFull) {
      recordBuffer(reel, max_id);
    } else {
      reel.sendBuffer();
      tapeDeck = setInterval(recordSegment, recordRateSecs * 1000);
    }
  });
};

var recordSegment = function (reel) {

  // ask the reel for the query
  // ask the reel for the since_id tweetid

  var url = 'https://api.twitter.com/1.1/search/tweets.json?' +
            'q=' + query + '&count=100' + '&result_type=recent' +
            '&since_id=' + tweetRecID;

  var tweetHandler = function (error, data, response) {
    var tweetStream
      , tweet
      , streamLength
      , segment = []
      , denFn = []
      , lastOffset = 0
      , currOffset = 0;

    if (error) { console.log('error', error); }
    else {
      tweetStream = JSON.parse(data).statuses;
      streamLength = tweetStream.length;

      tweetStream.forEach(function (e, index) {
        element = tweetStream[streamLength - 1 - index];
        tweet = formatTweet(element);
        tape.push(tweet);
        segment.push(tweet);

        currOffset = calcOffsetSecs(tweet.created_at);
        for (var i = 1; i < currOffset - lastOffset; i++) {
          denFn.push(0);
        }
        if (denFn[currOffset]) {
          denFn[currOffset]++;
        } else {
          denFn.push(1);
          lastOffset = currOffset;
        }
      });

      socket.emit('segment', {
        segment: segment,
        denFn: denFn
      });

      tweetRecID = tape[tape.length-1].twitterID;
      console.log('recID: ' + tweetRecID);
      tweetRecTime = tape[tape.length-1].created_at;
    }
  };
  getTweets(url, tweetHandler);
};
