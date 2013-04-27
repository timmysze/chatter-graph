var auth = require('./auth')
  , oa = auth.makeOAuth()
  , moment = require('moment')
  , tape = []
  , tapeIndex = 0
  , tapeTimelinePos = null
  , tapeStart = null
  , tapeBufferSecs = 30 // twitter search delay is about 7 seconds
  , tapeElapsedSecs = null
  , tapeTotMins = 10
  , tapeTotSecs = tapeTotMins * 60
  , recordRateSecs = 10
  , tapeDeck;

exports.index = function (req, res) {
  res.render('recorder');
};

exports.recordTrack = function (sock, sess, q, stamp) {
  if (!sess.hasOwnProperty('oAuthVars')) { return; }

  tapeStart = moment(stamp).subtract('seconds', tapeBufferSecs).utc().format();
  tapeEnd = moment(tapeStart).add('minutes', tapeTotMins).utc().format();

  var recordSegment = function () {
    var query = 'https://api.twitter.com/1.1/search/tweets.json?' +
                'q=' + q + '&count=100' + '&result_type=recent';

    if (tapeTimelinePos) { query += '&since_id=' + tapeTimelinePos; }

    console.log(query);

    oa.getProtectedResource(query, 'GET'
    , sess.oAuthVars.oauth_access_token
    , sess.oAuthVars.oauth_access_token_secret
    , function (error, data, response) {
      var tweetStream
        , tweet
        , streamLength
        , segment = [];

      if (error) { console.log('error', error); }
      else {
        tweetStream = JSON.parse(data).statuses;
        streamLength = tweetStream.length;

        tweetStream.forEach(function (e, index) {
          element = tweetStream[streamLength - 1 - index];
          if (moment(element.created_at) >= moment(tapeStart)) {
            tweet = {};
            tweet.tapeID = tapeIndex;
            tweet.created_at = moment(element.created_at).utc().format();
            console.log(tweet.created_at);
            tweet.twitterID = element.id_str;
            tweet.text = element.text;
            tweet.userID = element.user.id_str;
            tweet.userName = element.user.name;
            tweet.screenName = element.user.screen_name;
            tweet.location = element.user.location;
            tweet.entities = element.entities;

            tapeIndex++;
            tape.push(tweet);
            segment.push(tweet);
          }
        });

        // TODO: maybe fix this...
        tapeElapsedSecs += recordRateSecs;

        console.log(tapeElapsedSecs);
        console.log(tape.length);

        sock.emit('segment', { segment: segment });

        if (tape.length > 0){
          tapeTimelinePos = tape[tapeIndex-1].twitterID;

          // Finished rolling
          if (tapeElapsedSecs / 60 >= tapeTotMins) {
            clearInterval(tapeDeck);
            // TODO: emit finished to client
            // TODO: send tape to mongo, with headers
            // TODO: store the heights of the bars for quick drawing
          }
        }
      }
    });
  };

  var sendHeader = function () {
    var header = {}
      , url = 'https://api.twitter.com/1.1/account/settings.json';

    header.query = q;
    header.tapeStart = tapeStart;
    header.tapeEnd = tapeEnd;
    header.tapeTotSecs = tapeTotSecs;
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
  recordSegment();
  tapeDeck = setInterval(recordSegment, recordRateSecs * 1000);
};
