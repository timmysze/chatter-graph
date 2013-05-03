// console.log = function () {};

var socket = io.connect('http://127.0.0.1')
  , tapeStart
  , drawRateSecs
  , playSpeedSecs = 1
  , tweetQueue = []
  , denFn = []
  , pause = false
  , playTime = null;

// Graph variables
var w = Math.floor(document.querySelector('.center').scrollWidth * 1.0)
  , splitHeight = 100
  , underBarsHAdj = 0.6
  , h = splitHeight * (1 + underBarsHAdj)
  , scale = 1
  , unitPadding = 1
  , unitWidth = 3
  , unitHeight = scale;

//Create SVG element
var svg = d3.select('.wave')
            .insert('svg')
            .attr('width', w)
            .attr('height', h);

var cursor = $('<div class="cursor"></div>');
$('.wave').append(cursor);

var drawHeader = function (query, tapeStart, screen_name) {
  var queryNode = document.querySelector('.query')
    , tapeStartNode = document.querySelector('.tapeStart')
    , tapeRunNode = document.querySelector('.tapeRun')
    , nameNode = document.querySelector('.name')
    , dateString = moment(tapeStart).format('M/D/YYYY')
    , startTimeString = moment(tapeStart).format('h:mma')
    , runTimeString;

  playTime = tapeStart;
  runTimeString = moment(playTime).format('h:mma');

  queryNode.textContent = query;
  // tapeStartNode.textContent = 'Start time: ' + startTimeString;
  // tapeRunNode.textContent = 'Run time: ' + runTimeString;

  // nameNode.textContent = '@' + screen_name;
};

// MAYBE: stick this in some event handler for a button click
socket.emit('livePlay', { stamp: new Date() });

socket.on('header', function (data) {
  tapeStart = data.tapeStart;
  drawHeader(data.query, data.tapeStart, data.screen_name);
});

socket.on('buffer', function (data) {
  var scaleNode = document.querySelector('.scale');
  scale = data.scale;
  // scaleNode.textContent = ' scale: ' + scale + 'px';
  unitHeight = splitHeight / 100 * scale;

  drawRateSecs = data.secsPerBar;

  data.buffer.forEach(function (tweet) {
    tweetQueue.push(tweet);
  });

  data.denFn.forEach(function (bar) {
    denFn.push(bar);

    // drawBar([bar]);
    // currBar++;
  });

  startDrawing();
  startPlaying();
});

socket.on('segment', function (data) {
  data.segment.forEach(function (tweet) {
    tweetQueue.push(tweet);
  });
  data.denFn.forEach(function (bar) {
    denFn.push(bar);
    // drawBar([bar]);
    // currBar++;
  });
});

socket.on('finished', function () {});

// TODO: ability to select search term

var drawBar = function (data, currBar) {
  // TODO: refactor so these are params
  var rand = Math.floor((Math.random() * unitHeight) / 4)
    , overHeight = Math.floor(data[0] * unitHeight) + rand
    , underHeight = Math.floor((data[0] * unitHeight  + rand )* underBarsHAdj)
    , overY = splitHeight - overHeight
    , underY = splitHeight
    , currX = (currBar + 1) * (unitWidth + unitPadding) - 1;

  svg.selectAll('rect#over' + currBar)
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'over')
      .attr('id', 'over' + currBar)
      .attr('x', currX)
      .attr('y', splitHeight)
      .attr('height', 0)
      .transition()
      .duration(1050)
      .ease('')
      .attr('y', overY)
      .attr('width', unitWidth)
      .attr('height', overHeight);

  svg.selectAll('rect#under' + currBar)
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'under')
      .attr('id', 'under' + currBar)
      .attr('x', currX)
      .attr('y', underY)
      .attr('width', unitWidth)
      .attr('height', 0)
      .transition()
      .duration(1050)
      .ease('')
      .attr('height', underHeight);
};

var calcStep = function () {
  return unitWidth + unitPadding;
};

// var Slider = function () {
//   var prevTweet = -1;

// };

var BarSlider = function () {
  var prevBar = -1;

  return function (newBar) {
    var svgNode = $('svg')
      , currMargin = parseInt(svgNode.css('margin-left'));

    svgNode.css('margin-left', (currMargin - calcStep() * (newBar - prevBar)) + 'px');

    prevBar = newBar;
  };
};

var slideToBar = BarSlider();

var stretchWave = function () {
  var svgNode = $('svg')
    , newWidth = (parseInt(svgNode.css('width')) + calcStep()) + 'px';

  svgNode.css('width',newWidth);
};

var calcPlayTime = function (tweetQueueCount) {
  return moment(tweetQueue[tweetQueueCount].created_at).format('h:mm:ssa');
};

var startDrawing = function () {
  var currBar = 0;

  setInterval(function () {
    var tps = (tweetCount / barDrawn).toFixed(2);
    // TODO: make it such that can't go past cdf of currbar!
    if (denFn.length > currBar) {
      drawBar([denFn[currBar]], currBar);
      currBar++;
      stretchWave();
      $('.numTweets').text('Tweets recorded: ' + tweetCount);
      $('.duration').text('Duration (seconds): ' + barDrawn);
      if (!isNaN(tps)) {
        $('.tps').text('Tweets per second: ' + tps);
      }
    }
  }, playSpeedSecs * 1000);
};

var Painter = function () {
  var prevNum = -1
    , t = 0;

  return function (newNum) {
    if (newNum > prevNum) {
      for (var i = prevNum; i < newNum; i++) {
        t = i + 1;
        $('#over' + t).attr('class', 'over played');
        $('#under' + t).attr('class', 'under played');
      }
    } else {
      for (var i = newNum; i < prevNum; i++) {
        t = i + 1;
        $('#over' + t).attr('class', 'over');
        $('#under' + t).attr('class', 'under');
      }
    }

    prevNum = newNum;
  };
};

var paintPlayed = Painter();

var barDrawn = 0;
var cursor = 0;

// TODO: scroll to tweet

var tweetCount = 0;

var startPlaying = function () {

  setInterval(function () {
    // TODO: make it such that can't go past cdf of currbar!
    if (denFn.length > barDrawn) {
      var tweetNode
        , time = moment(tweetQueue[tweetCount].created_at)
                  .format('M-D-YYYY-HH-mm-ss')
        , divNode = $('<div class="' + time + '""></div>')
        , text = ''
        , timeNode = $('<div class="block"></div>');

      if (denFn[barDrawn] > 0) {
        timeNode.text(calcPlayTime(tweetCount));
        divNode.append(timeNode);
        for (var i = 0, l = denFn[barDrawn]; i < l; i++) {
          tweetNode = $('<div></div>');
          // text += calcPlayTime(tweetCount) + ' ';
          text += tweetQueue[tweetCount + i].text;
          tweetNode.text(text);
          tweetNode.addClass('tweet');
          divNode.append(tweetNode);
        }
        $('.tweets').append(divNode);
        tweetCount += denFn[barDrawn];
      }

      if (!pause) {
        paintPlayed(barDrawn);
        slideToBar(barDrawn);
        $('.tweets').animate({ scrollTop: $('.tweets')[0].scrollHeight}, 900);
        // resumePlayback();
        playTime = calcPlayTime(cursor);
        console.log(cursor);
        console.log(playTime);
        cursor++;
      }

      barDrawn++;
    }

  }, playSpeedSecs * 1000);
};

var pausePlayback = function () {
  pause = !pause;
};

// var resumePlayback = function () {
//   pause = false;
// };

var jumpToBeginning = function () {
  slideToBar(0);
  cursor = 0;
};

var jumpToEnd = function () {
  slideToBar(barDrawn);
  cursor = barDrawn;
};

// var scrollToTweet

$(document).ready(function () {
  // event listeners
  // $('.tweets').on('scroll', pausePlayback);
  $('.pause').on('click', pausePlayback);
  // $('.resume').on('click', resumePlayback);
  // $('.begin').on('click', jumpToBeginning);
  // $('.end').on('click', jumpToEnd);
});
