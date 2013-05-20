exports.makeBuffer = function (tape, firehose) {
  var tweetStream;

  var bufferLoop = function (max_id) {
    var opts = '';
    if (max_id) { opts = 'max_id=' + max_id; }

    firehose.search(function (error, data, response) {
      tweetStream = JSON.parse(data).statuses;
      tape.recordTweets(tweetStream);

      if (!tape.bufferDone()) {
        max_id = tweetStream[tweetStream.length-1].id_str;
        bufferLoop(max_id);
      }
    }, opts);
  };

  bufferLoop();
};

exports.recordStream = function (tape, firehose, rate) {
  var tweetStream;

  var recordLoop = function () {
    var lastTweetID = tape.getNewestTweetID()
      , opts = 'since_id=' + lastTweetID;

    firehose.search(function (error, data, response) {
      tweetStream = JSON.parse(data).statuses;
      tape.recordTweets(tweetStream);
    }, opts);
  };

  return setInterval(recordLoop, rate * 1000);
};

exports.stopStream = function (interval) { clearInterval(interval); };

exports.calcScale = function (array) {
  var safety = 0.6
    , maxUnits = 100
    , maxScale = 30
    , maxVal;

  maxVal = array.reduce(function (x, y) { return Math.max(x, y); }, 1);

  return Math.min(maxScale, Math.floor(maxUnits / maxVal * safety));
};
