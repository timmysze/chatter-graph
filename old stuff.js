var recordSegment = function () {
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

// tape player

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
      , url = 'https://api.twitter.com/1.1/search/tweets.json?' +
                'q=' + query + '&count=100' + '&result_type=recent';

    if (max_id) { url += '&max_id=' + max_id; }

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
          currOffset = calcOffsetSecs(ntweet.created_at);
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
        tweetRecID = tape[tape.length - 1].twitterID;
        console.log('recID: ' + tweetRecID);
        tweetRecTime = tape[tape.length-1].created_at;
        scale = calcScale(denFn);
        socket.emit('buffer', {
          buffer: buffer,
          denFn: denFn,
          secsPerBar: secsPerBar,
          scale: scale
        });
        tapeDeck = setInterval(recordSegment, recordRateSecs * 1000);
      }
    };
    getTweets(url, tweetHandler);
  };
  iterator();
};


  // iterator
  // get tweets
  // 
  // Step 0: check buffer full...
    // get tweets
    // Step 1: keep doing...

  // Step 2: send buffer

  // Step 3: start interval
