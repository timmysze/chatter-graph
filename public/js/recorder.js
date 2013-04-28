var socket = io.connect('http://127.0.0.1')
  , tapeStart
  , tapeEnd
  , totSecs
  , currBar = 0
  , currDrawTime
  , drawRateSecs
  , playSpeedSecs = 2
  , tweetQueue = []
  , denFn
  , cumDenFn;

// Graph variables
var numBars = 100;
var w = Math.floor(document.querySelector('.center').scrollWidth * 0.9);
var splitHeight = 180;
var underBarsHAdj = 0.75;
var h = splitHeight * (1 + underBarsHAdj);
var scale = 1;
var unitPadding = 2;
var unitWidth = Math.floor(w / numBars - unitPadding);
var unitHeight = splitHeight / 100 * scale;

//Create SVG element
var svg = d3.select('.center')
            .insert('svg')
            .attr('width', w)
            .attr('height', h);

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
// TODO: do something about this data...
socket.emit('record', { q: 'FML', stamp: new Date() });

socket.on('header', function (data) {
  tapeStart = data.tapeStart;
  tapeEnd = data.tapeEnd;
  drawHeader(data.query, data.tapeStart, data.screen_name);
});

socket.on('buffer', function (data) {
  var scaleNode = document.querySelector('.scale');

  data.buffer.forEach(function (tweet) {
    tweetQueue.push(tweet);
  });
  denFn = data.denFn;
  cumDenFn = data.cumDenFn;
  drawRateSecs = data.secsPerBar;
  scale = data.scale;
  scaleNode.textContent = ' scale: ' + scale + 'x';
  unitHeight = splitHeight / 100 * scale;
  startDrawing();
});

socket.on('segment', function (data) {
  data.segment.forEach(function (tweet) {
    tweetQueue.push(tweet);
  });
  denFn = data.denFn;
  cumDenFn = data.cumDenFn;
});

socket.on('finished', function () {

});

// TODO: add a textbox for entry of search query
  // in place editing of search term?

// MAYBE: refactor so that this takes those params for drawing
// MAYBE: move this into a module
var drawBar = function (data) {

  // TODO: refactor so that currBar and stuff are params
  var overHeight = Math.floor(data[0] * unitHeight)
    , underHeight = Math.floor(data[0] * unitHeight * underBarsHAdj)
    , overY = splitHeight - overHeight
    , underY = splitHeight
    , currX = currBar * (unitWidth + unitPadding);

  svg.selectAll('rect.over' + currBar)
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'over' + currBar)
      .attr('fill', '#000000')
      // .attr('fill', '#00C3FF')
      .attr('x', currX)
      .attr('y', splitHeight)
      .attr('height', 0)
      .transition()
      .duration(800)
      .ease('')
      .attr('y', overY)
      .attr('width', unitWidth)
      .attr('height', overHeight);

  svg.selectAll('rect.under' + currBar)
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'under' + currBar)
      .attr('fill', '#000000')
      // .attr('fill', '#00C3FF')
      .attr('opacity', '0.2')
      .attr('x', currX)
      .attr('y', underY)
      .attr('width', unitWidth)
      .attr('height', 0)
      .transition()
      .duration(800)
      .ease('')
      .attr('height', underHeight);
};

var drawPlayed = function (playNum) {

  // init the progress bar if not already
  svg.selectAll('rect.overProg').remove();
  svg.selectAll('rect.underProg').remove();
  var progOverBar = svg.selectAll('rect.overProg')
                    .data([0])
                    .enter()
                    .append('rect')
                    .attr('class', 'overProg');
  var progUnderBar = svg.selectAll('rect.underProg')
                    .data([0])
                    .enter()
                    .append('rect')
                    .attr('class', 'underProg');


  // reset all the bars colors
  svg.selectAll('rect')
      .attr('fill', '#000000');

  // reset the progBar
  progOverBar.attr('height', 0);
  progUnderBar.attr('height', 0);

  // playNum less than zero means show none
  if (playNum < 0) {
    // just reset
    return;
  }

  // use the cdf to calc which bars played
  // and fraction of which on i'm playing...
  // cdf is cumDenFn
  var upToBar = 0;
  for (var i = 0; i < numBars; i++) {
    if (playNum <= cumDenFn[i]) {
      upToBar = i;
      i = numBars;
    }
  }

  for (var i = 0; i < upToBar; i++) {
    svg.selectAll('rect.over'+i).attr('fill', '#00C3FF');
    svg.selectAll('rect.under'+i).attr('fill', '#00C3FF');
  }

  var blueUnits;

  // TODO: refactor to turnery operator
  if (upToBar) {
    blueUnits = playNum - cumDenFn[upToBar - 1];
  } else {
    blueUnits = playNum;
  }

  var overHeight = Math.floor(blueUnits * unitHeight);
  var underHeight = Math.floor(blueUnits * unitHeight * underBarsHAdj);
  var overY = splitHeight - overHeight;
  var underY = splitHeight;
  var currX = upToBar * (unitWidth + unitPadding);

  progOverBar.data([blueUnits])
              .attr('fill', '#00C3FF')
              .attr('x', currX)
              .attr('y', overY)
              .attr('width', unitWidth)
              .attr('height', overHeight);

  progUnderBar.data([blueUnits])
              .attr('fill', '#BAEFFF')
              // .attr('opacity', '0.2')
              .attr('x', currX)
              .attr('y', underY)
              .attr('width', unitWidth)
              .attr('height', underHeight);
};

var startPlaying = function () {
  var counter = 0;
  setInterval(function () {
    // TODO: make it such that can't go past cdf of currbar!
    // GENIUS FOR df and cdf!!
    if (tweetQueue[counter]) {
      var tweetsNode = document.querySelector('.tweets')
        , nameNode = document.querySelector('.name')
        , newTweetNode = document.createElement('div');
      // console.log(tweetsNode);
      newTweetNode.textContent = tweetQueue[counter].text;
      tweetsNode.appendChild(newTweetNode);
      newTweetNode.scrollIntoView();
      // tweetsNode.textContent = tweetQueue[counter].text;
      nameNode.textContent = '@'+ tweetQueue[counter].screenName;
      // console.log(moment(tweetQueue[counter].created_at).format());
      // console.log(tweetQueue[counter].twitterID);
      drawPlayed(counter);
      counter++;
    }
  }, playSpeedSecs * 1000);
};

var startDrawing = function () {
  if(denFn[currBar]){
    drawBar([denFn[currBar]]);
    currBar++;
  }
  startPlaying();
  setInterval(function () {
    drawBar([denFn[currBar]]);
    if (currBar++ > numBars) {   clearInterval(); }
  }, drawRateSecs * 1000);
};
