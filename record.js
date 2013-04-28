var auth = require('./auth')
  , oa = auth.makeOAuth()
  , moment = require('moment')
  // , tapeIndex = 0
  , tapeTimelinePos = null
  , tapeStart = null
  // , tapeBufferSecs = 30 // twitter search delay is about 7 seconds
  , tapeTotMins = 10
  , recordRateSecs = 8
  , tapeDeck
  , numBars = 100
  , secsPerBar = Math.ceil(tapeTotMins * 60 / numBars)
  , scale = 1
  , tape = []
  , denFn = []
  , cumDenFn = [];

for (var i = 0; i < 100; i++) {
  denFn.push(0);
  cumDenFn.push(0);
}

var calcCumDenFn = function () {
  cumDenFn[0] = denFn[0];
  for (var i = 1, l = denFn.length; i < l; i++) {
    cumDenFn[i] = cumDenFn[i-1] + denFn[i];
  }
};

exports.index = function (req, res) {
  res.render('recorder');
};

exports.recordTrack = function (sock, sess, q, stamp) {
  if (!sess.hasOwnProperty('oAuthVars')) { return; }

  tapeStart = moment(stamp).subtract('m', 1).startOf('minute').utc().format();
  tapeEnd = moment(tapeStart).add('m', tapeTotMins).utc().format();

  var calcBar = function (time) {
    console.log('cal bar');
    console.log(Math.floor(moment(time).diff(moment(tapeStart), 'seconds') / secsPerBar));
    return Math.floor(moment(time).diff(moment(tapeStart), 'seconds') / secsPerBar);
  };

  var calcScale = function (array) {
    var safety = 0.75
      , maxUnits = 100;

    var maxVal = array.reduce(function (prev, curr) {
      return Math.max(prev, curr);
    }, 1);
    console.log('max: ' + maxVal);
    return Math.floor(maxUnits / maxVal * safety);
  };

  var getTweets = function (query, callback) {
    oa.getProtectedResource(query, 'GET'
        , sess.oAuthVars.oauth_access_token
        , sess.oAuthVars.oauth_access_token_secret
        , callback);
  };

  var formatTweet = function (element) {
    var tweet = {};
    // tweet.tapeID = tapeIndex;
    tweet.created_at = moment(element.created_at).utc().format();
    console.log(tweet.created_at);
    tweet.twitterID = element.id_str;
    tweet.text = element.text;
    tweet.userID = element.user.id_str;
    tweet.userName = element.user.name;
    tweet.screenName = element.user.screen_name;
    tweet.location = element.user.location;
    tweet.entities = element.entities;
    return tweet;
  };

  var recordSegment = function () {
    console.log('tape time pos: ' + tapeTimelinePos);
    var query = 'https://api.twitter.com/1.1/search/tweets.json?' +
                'q=' + q + '&count=100' + '&result_type=recent' +
                '&since_id=' + tapeTimelinePos;

    var tweethandler = function (error, data, response) {
      console.log('handling stuff');
      var tweetStream
        , tweet
        , barNum
        , streamLength
        , segment = [];

      if (error) { console.log('error', error); }
      else {
        tweetStream = JSON.parse(data).statuses;
        streamLength = tweetStream.length;

        tweetStream.forEach(function (e, index) {
          element = tweetStream[streamLength - 1 - index];
          // if (moment(element.created_at) >= moment(tapeStart)) {}
          if (moment(element.created_at) > moment(tapeEnd)) {
            clearInterval();
            // TODO: emit finished to client
            sock.emit('finished');
            // TODO: send tape to mongo, with headers
            // TODO: store the heights of the bars for quick drawing
          } else {
            tweet = formatTweet(element);
            // tapeIndex++;
            tape.push(tweet);
            segment.push(tweet);
            barNum = calcBar(tweet.created_at);
            denFn[barNum]++;
          }
        });

        calcCumDenFn();
        sock.emit('segment', {
          segment: segment,
          denFn: denFn,
          cumDenFn: cumDenFn
        });
        tapeTimelinePos = tape[tape.length-1].twitterID;
      }
    };

    getTweets(query, tweethandler);
  };

  var recordBuffer = function () {
    var buffer = []
      , bufferFull = false;

    // Grab historical tweets until fill buffer
    (function iterator (max_id) {
      var tweetStream
        , tweet
        , barNum
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
              barNum = calcBar(tweet.created_at);
              denFn[barNum]++;
            } else {
              bufferFull = true;
            }
          });
        }

        if (!bufferFull) {
          console.log('yo: ' + tape[0].twitterID);
          iterator(tape[0].twitterID);
        } else {
          // MAYBE: handling full buffer w/o any data
          calcCumDenFn();
          tapeTimelinePos = tape[tape.length - 1].twitterID;
          scale = calcScale(denFn);
          sock.emit('buffer', {
            buffer: buffer,
            denFn: denFn,
            cumDenFn: cumDenFn,
            secsPerBar: secsPerBar,
            scale: scale
          });
          tapeDeck = setInterval(recordSegment, recordRateSecs * 1000);
        }
      };

      getTweets(query, tweetHandler);
    })();
  };

  var sendHeader = function () {
    var header = {}
      , url = 'https://api.twitter.com/1.1/account/settings.json';

    header.query = q;
    header.tapeStart = tapeStart;
    header.tapeEnd = tapeEnd;
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
