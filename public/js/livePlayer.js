var socket = io.connect('http://127.0.0.1')
  , tapeStart
  , drawRateSecs
  , playSpeedSecs = 1
  , tweetQueue = []
  , denFn = []
  , pause = false
  , playTime = null;

// Graph variables
var w = Math.floor(document.querySelector('.center').scrollWidth * 0.9)
  , splitHeight = 180
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
    , nameNode = document.querySelector('.name')
    , dateString = moment(tapeStart).format('M/D/YYYY')
    , startTimeString = moment(tapeStart).format('HH:mma');

  queryNode.textContent = query;
  tapeStartNode.textContent = dateString + ' ' + startTimeString;

  // nameNode.textContent = '@' + screen_name;
};

// MAYBE: stick this in some event handler for a button click
socket.emit('livePlay', { q: 'FML', stamp: new Date() });

socket.on('header', function (data) {
  tapeStart = data.tapeStart;
  drawHeader(data.query, data.tapeStart, data.screen_name);
});

socket.on('buffer', function (data) {
  var scaleNode = document.querySelector('.scale');
  scale = data.scale;
  scaleNode.textContent = ' scale: ' + scale + 'px';
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
    , currX = currBar * (unitWidth + unitPadding);

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
      .duration(500)
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
      .duration(500)
      .ease('')
      .attr('height', underHeight);
};

var calcStep = function () {
  return unitWidth + unitPadding;
};

var slideWaveLeft = function () {
  var svgNode = $('svg')
    , currMargin = parseInt(svgNode.css('margin-left'));

  svgNode.css('margin-left', (currMargin - calcStep()) + 'px');
};

var stretchWave = function () {
  var svgNode = $('svg')
    , newWidth = (parseInt(svgNode.css('width')) + calcStep()) + 'px';

  svgNode.css('width',newWidth);
};

var startDrawing = function () {
  var currBar = 0;

  setInterval(function () {
    // TODO: make it such that can't go past cdf of currbar!
    if (denFn.length > currBar) {
      drawBar([denFn[currBar]], currBar);
      currBar++;
      stretchWave();
    }
  }, playSpeedSecs * 500);
};

var paintPlayed = function (newNum) {
  var prevNum = -1
    , t = 0;

  (function () {
    if (newNum > prevNum) {
      for (var i = prevNum; i < newNum; i++) {
        t = i + 1;
        $('#over' + t).attr('class', 'over played');
        $('#under' + t).attr('class', 'under played');
      }
    } else {
      for (var i = newNum; i > prevNum; i--) {
        t = i + 1;
        $('#over' + t).attr('class', 'over');
        $('#under' + t).attr('class', 'under');
      }
    }

    prevNum = newNum;
  })();
};

var startPlaying = function () {
  var barCount = 0
    , tweetCount = 0;

  setInterval(function () {
    // TODO: make it such that can't go past cdf of currbar!
    if (denFn.length > barCount) {
      var tweetNode
        , time = moment(tweetQueue[tweetCount].created_at)
                  .format('M-D-YYYY-HH-mm-ss')
        , divNode = $('<div class="' + time + '""></div>');

      for (var i = 0, l = denFn[barCount]; i < l; i++) {
        tweetNode = $('<div></div>');
        tweetNode.text(tweetQueue[tweetCount + i].text);
        tweetNode.addClass('tweet');
        divNode.append(tweetNode);
      }

      $('.tweets').append(divNode);
      tweetCount += denFn[barCount];

      if (!pause) {
        paintPlayed(barCount);
        $('.tweets').animate({ scrollTop: $('.tweets')[0].scrollHeight}, 900);
        slideWaveLeft();
      }

      barCount++;
    }

  }, playSpeedSecs * 1000);
};
