// console.log = function () {};

// Module Dependencies

var express = require('express')
  , app = express()
  , RedisStore = require('connect-redis')(express)
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , site = require('./site')
  , twitterAuth = require('./lib/auth')
  , recorder = require('./recorder')
  , http = require('http')
  , path = require('path')
  , query = 'FML'
  , redis = require('redis')
  , store;

var cookieParser = express.cookieParser(process.env.CHATTER_SESSION_SECRET);

server.listen(3000);
console.log('Express server listening on port 3000');

// Session Setup

if (process.env.NODE_ENV === 'production') {
  var client = redis.createClient(6379, 'nodejitsudb681017101.redis.irstack.com');
  client.twitterAuth('nodejitsudb681017101.redis.irstack.com:f327cfe980c971946e80b8e975fbebb4');
  store = new RedisStore({ client: client });
} else {
  store = new RedisStore();
}

var SessionSockets = require('session.socket.io')
  , sessionSockets = new SessionSockets(io, store, cookieParser);

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

// Routes

app.get('/', site.index);
app.get(twitterAuth.loginURL, twitterAuth.loginHandler);
app.get(twitterAuth.callbackURL, twitterAuth.callbackHandler);
app.get(twitterAuth.redirectURL, livePlay.index);

// Socket Connections

sessionSockets.on('connection', function (err, socket, session) {
  socket.on('livePlay', function (data) {
    recorder.start(socket, session, query, data.stamp);
  });

  socket.on('enterQuery', function (data) {
    query = data;
  });

  socket.on('disconnect', function () {
    // TODO: implement this function.
    livePlay.shutDown();
  });
});
