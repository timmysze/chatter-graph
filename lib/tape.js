/*

This defines the Tape class.
  - a tape holds a sequence of tweets for a query and time slice
  - you can send tweets to a tape
  - you can pass a tape to a tapeDeck

*/

var moment = require('moment');

var Tape = function (q, timeStamp, bufferMin) {
  this._query = q || 'FML';
  this._bufferMin = bufferMin || 1;
  this._startTime = moment(timeStamp).subtract('m', )
                  .startOf('minute').utc().format();
  this._tweets = [];
  this._tweetIDs = {};
  this._denFn = [];
  this._newestTweet = 0;
};

Tape.prototype.calcPositionIndex = function (time) {
  time = moment(time).utc();

  // moment.js rounds numbers down, so need to add 1
  return time.diff(moment(this._startTime), 'seconds') + 1;
};

Tape.prototype.calcTimeIndex = function (position) {
  return moment(this._startTime).add('seconds', position).utc().format();
};

var makeFormattedTweet = function (tweetObj) {
  var tweet = {};
  tweet.created_at = moment(tweetObj.created_at).utc().format();
  tweet.twitterID = tweetObj.id_str;
  tweet.text = tweetObj.text;
  tweet.screenName = tweetObj.user.screen_name;
  // tweet.userID = tweetObj.user.id_str;
  // tweet.userName = tweetObj.user.name;
  // tweet.location = tweetObj.user.location;
  // tweet.entities = tweetObj.entities;
  return tweet;
};

Tape.prototype.recordTweets = function (tweetObjArray) {
  tweetObjArray.forEach(function (tweetObj) {
    var tweet = makeFormattedTweet(tweetObj);
    this.recordTweet(tweet);
  }, this);
};

Tape.prototype.recordTweet = function (tweet) {
  var position = this.calcPositionIndex(tweet.created_at);
  if (!(tweet.twitterID in this._tweetIDs)) {
    if (tweet.twitterID > this._newestTweet) { this._newestTweet = tweet.twitterID; }

    this._tweetIDs[tweet.twitterID] = true;

    this._tweets[position] || (this._tweets[position] = []);
    this._tweets[position].push(tweet);

    this._denFn[position] || (this._denFn[position] = 0);
    this._denFn[position]++;

    return true;
  }
  return false;
};

Tape.prototype.getTweets = function (startTime, endTime) {
  var startPos, endPos;
  if (startTime && endTime) {
    startPos = this.calcPositionIndex(startTime);
    endPos = this.calcPositionIndex(endTime);
    return this._tweets.slice(startPos, endPos + 1);
  } else if (startTime) {
    startPos = this.calcPositionIndex(startTime);
    return this._tweets.slice(startPos);
  } else {
    return this._tweets.slice();
  }
};

Tape.prototype.bufferDone = function () { return !!this.tweets[0]; };

Tape.prototype.getQuery = function () { return this._query; };
Tape.prototype.getStartTime = function () { return this._startTime; };
Tape.prototype.getDenFn = function () { return this._denFn; };
Tape.prototype.getNewestTweetID = function () { return _newestTweet; };

exports.Tape = Tape;
