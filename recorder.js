var Tape = require('./lib/tape').Tape
  , TapeDeck = require('./lib/tapedeck').TapeDeck;

exports.index = function (req, res) {
  res.render('recorder', { siteURL: process.env.CHATTER_CALLBACK_URL });
};

exports.start = function (sock, sess, query, timeStamp) {
  if (!sess.hasOwnProperty('oAuthVars')) { return; }

  var tape = new Tape(query, timeStamp)
    , tapeDeck = new TapeDeck(sock, sess, tape);

  tapeDeck.start();
};
