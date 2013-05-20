/*

A TapeDeck can record and play a tape.
  - pass it a blank tape and it can record to it

*/

var auth = require('../auth')
  , oa = auth.makeOAuth()
  , moment = require('moment')
  , series = require('async').series
  , twitter = require('./twitter');

var makeBuffer = require('./tapedeckHelpers').makeBuffer
  , recordStream = require('./tapedeckHelpers').recordStream
  , stopStream = require('./tapedeckHelpers').stopStream
  , calcScale = require('./tapedeckHelpers').calcScale;

var TapeDeck = function (sock, sess, tape) {
  this._socket = sock;
  this._session = sess;
  this._tape = tape;
  this._head = -1;
  this._firehose = new twitter.Firehose(sess, this._tape.getQuery());
};

TapeDeck.prototype.start = function () {
  var that = this
    , rate = 7;

  this.sendHeader();
  series([
    function () {
      makeBuffer(that._tape, that._firehose);},
    function () {
      recordStream(that._tape, that._firehose, rate);
      series([
        this.sendBuffer,
        function () {  }
      ]);
    }
  ]);
};

TapeDeck.prototype.sendHeader = function () {
  var header = {};
  header.query = this._tape.getQuery();
  header.tapeStart = this._tape.getStartTime();

  this._firehose.account(function (error, data, response) {
    if (error) { console.log('ERROR: ', error); }
    header.screen_name = JSON.parse(data).screen_name;
    this._socket.emit('header', header);
  });
};

TapeDeck.prototype.sendBuffer = function () {
  var units = bufferMin * 60 - 1;
  var denFn = this._denFn.slice(0, units);
  var scale = calcScale(denFn);
  var buffer = [];

  for (var i = 0; i <= units; i++) {
    for (var key in this._tape[this.calcTimeIndex(i)]){
      buffer.push(this._tape[this.calcTimeIndex(i)][key]);
    }
  }

  this.socket.emit('buffer', {
    secsPerBar: secsPerBar,
    denFn: denFn,
    scale: scale,
    buffer: buffer
  });
};

TapeDeck.prototype.saveAndPackage = function () {
  // TODO: send to mongo
  // TODO: but send it as arrays...
};

exports.TapeDeck = TapeDeck;
