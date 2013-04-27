// MAYBE: stick this in some event handler for a button click
var socket = io.connect('http://127.0.0.1')
  , tapeStart
  , tapeEnd
  , totSecs
  , currDrawSec = 0
  , currDrawTime
  , drawRateSecs
  , drawQueue = [];

var drawHeader = function (query, tapeStart, screen_name) {
  var queryNode = document.querySelector('.query')
    , tapeStartNode = document.querySelector('.tapeStart')
    , nameNode = document.querySelector('.name')
    , dateString = moment(tapeStart).format('M.D.YYYY')
    , startTimeString = moment(tapeStart).format('HH.mm.ss');

  queryNode.textContent = query;
  tapeStartNode.textContent = dateString + ' ' + startTimeString;
  nameNode.textContent = '@' + screen_name;
};

socket.emit('record', { q: 'boston', stamp: new Date() });

socket.on('segment', function (data) {
  data.segment.forEach(function (tweet) {
    console.log('tweet to draw: ' + tweet);
    drawQueue.push(tweet);
  });
  if (!startedDrawing) { startDrawing(); }
});

socket.on('header', function (data) {
  tapeStart = data.tapeStart;
  tapeEnd = data.tapeEnd;
  totSecs = data.tapeTotSecs;
  drawHeader(data.query, data.tapeStart, data.screen_name);
});




// TODO: add a textbox for entry of search query
  // in place editing of search term?



// Graph variables
var w = 860;
var splitHeight = 180;
var underBarsHeightAdjust = 0.75;
var h = splitHeight * (1 + underBarsHeightAdjust);
var unitPadding = 2;
var unitWidth = w / numBars - unitPadding;
var unitHeight = splitHeight / 100;
var numBars = 100;
var mod = Math.ceil(totSecs / numBars);

drawRateSecs = mod;

var drawnTweets = [];


//Create SVG element
var svg = d3.select("body")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

// MAYBE: refactor so that this takes those params for drawing
// MAYBE: move this into a module
function drawGraph(data) {
  var barsTracker = {};
  // console.log('mod: ', mod);

  var barNumber = function (time) {
    // console.log('tapestart: ' + moment(tapeStart).format('hh.mm.ss'));
    // console.log('tape this one: ' + moment(time).format('hh.mm.ss'));
    var a = Math.floor(moment(time).diff(moment(tapeStart), 'seconds') / mod);
    // console.log('bar num: ',a);
    return a;
  };

  var barHeight = function (time) {
    var barNum = barNumber(time);
    if (!barsTracker[barNum]) { barsTracker[barNum] = 0; }
    return barsTracker[barNum]++;
  };

  // MAYBE: refactor so don't need to redraw...
  // Clear bars
  svg.selectAll("rect").remove();

  // Draw over bars
  svg.selectAll("rect.over")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", function(d, i) {
        return barNumber(d.created_at) * (unitWidth + unitPadding);
      })
      .attr("y", function(d){
        return splitHeight - barHeight(d.created_at) * unitHeight;
      })
      .attr("fill", "#00C3FF")
     // .attr("height", 0)
     // .transition()
     //   .duration(800)
     //   .ease('')
      .attr("width", unitWidth)
      .attr("height", unitHeight);

  // Draw under bars
  svg.selectAll("rect.under")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", function(d, i) {
        return barNumber(d.created_at) * (unitWidth + unitPadding);
      })
      .attr("y", function(d){
        return splitHeight + (barHeight(d.created_at) - 1) * unitWidth;
      })
      .attr("width", unitWidth)
      .attr("height", unitHeight)
      .attr("fill", "#00C3FF")
      .attr("opacity", "0.2");
}

var startedDrawing = false;
var startDrawing = function () {
  setInterval(function () {
    if (currDrawSec++ > totSecs) { clearInterval(); }
    currDrawTime = moment(tapeStart).add('seconds', currDrawSec);
    // console.log('tape start: ' + moment(tapeStart).format('hh.mm.ss'));
    // console.log('current drawtime: ' + moment(currDrawTime).format('hh.mm.ss'));
    while (drawQueue[0] && (moment(drawQueue[0].created_at) <= currDrawTime)) {
      var aaa = drawQueue.shift();
      // console.log(aaa);
      drawnTweets.push(aaa);
    }
    drawGraph(drawnTweets);
  }, drawRateSecs * 1000);
  startedDrawing = true;
};

  // setInterval(function () {
  //   if (currDrawSec++ > totSecs) { clearInterval(); }
  //   currDrawTime = moment(tapeStart).add('seconds', currDrawSec);
  //   // console.log('tape start: ' + moment(tapeStart).format('hh.mm.ss'));
  //   // console.log('current drawtime: ' + moment(currDrawTime).format('hh.mm.ss'));
  //   while (drawQueue[0] && (moment(drawQueue[0].created_at) <= currDrawTime)) {
  //     var aaa = drawQueue.shift();

  //   }
  //   drawGraph();
  // }, drawRateSecs * 1000);


