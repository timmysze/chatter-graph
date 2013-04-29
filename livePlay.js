var auth = require('./auth')
  , oa = auth.makeOAuth()
  , moment = require('moment')
  , lastTweetID = null
  , lastTweetTime = null
  , tapeStart = null
  , recordRateSecs = 10
  , tapeDeck
  , secsPerBar = 1
  , scale = 1
  , tape = []
  , stop = false;

exports.index = function (req, res) {
  res.render('liveplayer');
};

exports.recordTrack = function (sock, sess, q, stamp) {
  if (!sess.hasOwnProperty('oAuthVars')) { return; }
  sock.on('stop', function (data) { stop = true; });

  tapeStart = moment(stamp).subtract('m', 1).startOf('minute').utc().format();
  lastTweetTime = tapeStart;

  var calcScale = function (array) {
    var safety = 0.6
      , maxUnits = 100
      , maxScale = 30
      , maxVal = array.reduce(function (prev, curr) {
        return Math.max(prev, curr);
      }, 1);

    return Math.min(maxScale, Math.floor(maxUnits / maxVal * safety));
  };

  var getTweets = function (query, callback) {
    oa.getProtectedResource(query, 'GET'
        , sess.oAuthVars.oauth_access_token
        , sess.oAuthVars.oauth_access_token_secret
        , callback);
  };

  var formatTweet = function (element) {
    var tweet = {};
    tweet.created_at = moment(element.created_at).utc().format();
    console.log(tweet.created_at);
    tweet.twitterID = element.id_str;
    tweet.text = element.text;
    // tweet.userID = element.user.id_str;
    // tweet.userName = element.user.name;
    tweet.screenName = element.user.screen_name;
    // tweet.location = element.user.location;
    // tweet.entities = element.entities;
    return tweet;
  };

  var offsetSecs = function (time) {
    return moment(time).diff(moment(lastTweetTime), 'seconds');
  };

  var recordSegment = function () {
    var query = 'https://api.twitter.com/1.1/search/tweets.json?' +
                'q=' + q + '&count=100' + '&result_type=recent' +
                '&since_id=' + lastTweetID;

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

          currOffset = offsetSecs(tweet.created_at);
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

        sock.emit('segment', {
          segment: segment,
          denFn: denFn
        });

        lastTweetID = tape[tape.length-1].twitterID;
        lastTweetTime = tape[tape.length-1].created_at;
      }
    };

    getTweets(query, tweetHandler);
  };

  var recordBuffer = function () {
    var buffer = []
      , bufferFull = false
      , denFn = []
      , lastOffset = 0
      , currOffset = 0;

    // Grab historical tweets until fill buffer
    var iterator = function (max_id) {
      var tweetStream
        , tweet
        , query = 'https://api.twitter.com/1.1/search/tweets.json?' +
                  'q=' + q + '&count=100' + '&result_type=recent';

      if (max_id) { query += '&max_id=' + max_id; }

      var tweetHandler = function (error, data, response) {

        if (error) { console.log('error', error); }
        else {
          tweetStream = JSON.parse(data).statuses;
          // MAYBE: if max_id, then skip the first one?

          tweetStream.forEach(function (element, index) {
            if (moment(element.created_at) >= moment(tapeStart)) {
              tweet = formatTweet(element);
              tape.unshift(tweet);
              buffer.unshift(tweet);
            } else {
              bufferFull = true;
            }
          });
        }

        if (!bufferFull) {
          iterator(tape[0].twitterID);
        } else {
          for (var i = 0, l = buffer.length; i < l; i++) {
            var ntweet = buffer[i];
            currOffset = offsetSecs(ntweet.created_at);
            for (var j = 1; j < currOffset - lastOffset; j++) {
              denFn.push(0);
            }
            if (denFn[currOffset]) {
              denFn[currOffset]++;
            } else {
              denFn.push(1);
              lastOffset = currOffset;
            }
          }

          // MAYBE: handling full buffer w/o any data
          lastTweetID = tape[tape.length - 1].twitterID;
          lastTweetTime = tape[tape.length-1].created_at;
          scale = calcScale(denFn);
          sock.emit('buffer', {
            buffer: buffer,
            denFn: denFn,
            secsPerBar: secsPerBar,
            scale: scale
          });
          tapeDeck = setInterval(recordSegment, recordRateSecs * 1000);
        }
      };

      getTweets(query, tweetHandler);
    };

    iterator();
  };

  var sendHeader = function () {
    var header = {}
      , url = 'https://api.twitter.com/1.1/account/settings.json';

    header.query = q;
    header.tapeStart = tapeStart;
    oa.getProtectedResource(url, 'GET'
        , sess.oAuthVars.oauth_access_token
        , sess.oAuthVars.oauth_access_token_secret
        , function (error, data, response) {
          if (error) { console.log('error', error); }
          header.screen_name = JSON.parse(data).screen_name;
          sock.emit('header', header);
        });
  };

  sendHeader();
  recordBuffer();
};
