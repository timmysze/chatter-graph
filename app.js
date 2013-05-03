// console.log = function () {};

/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , RedisStore = require('connect-redis')(express)
  , store = new RedisStore()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , site = require('./site')
  , auth = require('./auth')
  , rec = require('./record')
  , livePlay = require('./livePlay')
  , http = require('http')
  , path = require('path')
  , query = 'FML';

var cookieParser = express.cookieParser(process.env.CHATTER_SESSION_SECRET);

server.listen(3000);
console.log('Express server listening on port 3000');

// Config

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(cookieParser);
app.use(express.session({ secret: process.env.CHATTER_SESSION_SECRET, store: store }));
app.use(app.router);
app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

var SessionSockets = require('session.socket.io')
  , sessionSockets = new SessionSockets(io, store, cookieParser);

// General

app.get('/', site.index);

// Auth

app.get(auth.loginURL, auth.twitterLogin);
app.get(auth.callbackURL, auth.twitterCallback);

// Recording
// app.get(auth.redirectURL, rec.index);

// Live Player
app.get(auth.redirectURL, livePlay.index);

sessionSockets.on('connection', function (err, socket, session) {
  // socket.on('record', function (data) {
  //   rec.recordTrack(socket, session, data.q, data.stamp);
  // });

  socket.on('livePlay', function (data) {
    livePlay.startNewRecording(socket, session, query, data.stamp);
  });

  socket.on('enterQuery', function (data) {
    query = data;
  });

  socket.on('disconnect', function () {
    livePlay.shutDown();
  });
});
