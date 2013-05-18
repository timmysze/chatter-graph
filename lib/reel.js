var auth = require('../auth')
  , oa = auth.makeOAuth()
  , moment = require('moment');
 
exports.Reel = function (sock, sess, q, timeStamp) {
  this.socket = sock;
  this.session = sess;
  this.query = q || 'FML';
  this.startTime = moment(stamp).subtract('m', this.bufferMin)
                  .startOf('minute').utc().format();
  // this.recTime = startTime;
  this.tape = {};
  this.denFn = [];
  // this.cmdFn = [];
  this.bufferFull = false;
  // this.bufferIndex = 0;
  // this.recId = 0;
  this.sentIndex = -1;
  // this.bufferURL = 

  // this.socket.on('stop', this.stop());
};

Reel.prototype.stop = function () {};

Reel.prototype.send = function () {};

Reel.prototype.index = function (time) {
  time = moment(time).utc();

  // moment.js rounds numbers down, so need to add 1
  return time.diff(moment(this.startTime), 'seconds') + 1;
};

Reel.prototype.timeIndex = function (index) {

  return moment(this.startTime).add('seconds', 1).utc().format();
};


Reel.prototype.updateDenFn = function (tweetTime) {
  this.denFn[this.index(tweetTime)] = Object.keys(this.tape[tweetTime]).length;
};

Reel.prototype.addToBuffer = function (rawTweet) {
  if (moment(rawTweet.created_at) >= moment(this.startTime)) {
    tweet = formatTweet(rawTweet);
    if (!this.tape[tweet.created_at]) { this.tape[tweet.created_at] = {}; }
    this.tape[tweet.created_at][tweet.twitterID] = tweet;
    this.updateDenFn(tweet.created_at);
  } else {
    this.bufferFull = true;
  }
};

Reel.prototype.addToSegment = function (rawTweet) {
  // TODO:
};

Reel.prototype.sendHeader = function () {
  var header = {}
    , url = 'https://api.twitter.com/1.1/account/settings.json';

  header.query = this.query;
  header.tapeStart = this.startTime;
  oa.getProtectedResource(url, 'GET'
      , this.session.oAuthVars.oauth_access_token
      , this.session.oAuthVars.oauth_access_token_secret
      , function (error, data, response) {
        if (error) { console.log('error', error); }
        header.screen_name = JSON.parse(data).screen_name;
        this.socket.emit('header', header);
      });
};

Reel.prototype.sendBuffer = function () {
  var units = bufferMin * 60 - 1;
  var denFn = this.denFn.slice(0, units);
  var scale = calcScale(denFn);
  var buffer = [];

  for (var i = 0; i <= units; i++) {
    for (var key in this.tape[this.timeIndex(i)]){
      buffer.push(this.tape[this.timeIndex(i)][key]);
    }
  }

  this.socket.emit('buffer', {
    secsPerBar: secsPerBar,
    denFn: denFn,
    scale: scale,
    buffer: buffer
  });
};

Reel.prototype.

Reel.prototype.saveAndPackage = function () {
  // TODO: send to mongo
  // TODO: but send it as arrays...
};
