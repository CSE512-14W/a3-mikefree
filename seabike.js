d3.csv("bridge_data.csv", function(error, rawData) {

  // Various formatters.
  var height = 250
  var formatNumber = d3.format(",d"),
      formatChange = d3.format("+,d"),
      formatDate = d3.time.format("%B %d, %Y"),
      formatTime = d3.time.format("%I:%M %p")
      formatPercent = d3.format('%0');
	var formatTitleDate = function(d) {
		var monthNames = [ "Jan.", "Feb.", "March", "April", "May", "June",
   				 "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec." ];
   		var month = monthNames[d.getMonth()]
   		var date = d.getDate()
   		var year = d.getFullYear()
		return month + ' ' + date + ', ' + year	
	}
	var formatTitleTime = function(d) {
		var d = Math.round(d)
		var hour = (d == 0 | d == 12 | d == 24)? "12" : String(d%12);
		var meridian = d<12 ? "AM" : "PM"
		var time = hour + ':00 ' + meridian
		return time
	}


data = []
var index = 0
rawData.forEach(function(d, i) {
	data.push({index:index,date:new Date(d.Date), direction:'north', value:Number(d['Fremont Bridge NB'])})
	index += 1
	data.push({index:index, date:new Date(d.Date), direction:'south', value:Number(d['Fremont Bridge SB'])})
});


// Create the crossfilter for the relevant dimensions and groups.
var cf = crossfilter(data),
all = cf.groupAll(),
date = cf.dimension(function(d) { return d.date; }),
dates = date.group(d3.time.day),
dateBikers = date.group(d3.time.day).reduceSum(function(d) {return d.value})

hour = cf.dimension(function(d) { return d.date.getHours() + d.date.getMinutes() / 60; }),
hours = hour.group(Math.floor).reduceSum(function(d) {return d.value})
hourBikers =hour.group(Math.floor).reduceSum(function(d) {return d.value})

var dayNames = ['Su', 'M', 'T', 'W', 'Th', 'F', 'S']
var fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
day = cf.dimension(function(d) {return d.date.getDay()}),
days = day.group().reduceSum(function(d) {return d.value})
dayBikers =day.group().reduceSum(function(d) {return d.value})

// Calculate min/max values
var minDate =  d3.min(dates.all().map(function(d) {return d.key})) 
var maxDate =  d3.max(dates.all().map(function(d) {return d.key})) 
var maxDayBikers = d3.max(dateBikers.all().map(function(d) {return d.value})) 
var maxHourBikers = d3.max(hourBikers.all().map(function(d) {return d.value}))
var maxWeekdayBikers = d3.max(dayBikers.all().map(function(d) {return d.value}))

// Set titles
d3.select('#startdate').text(formatTitleDate(minDate))
d3.select('#enddate').text(formatTitleDate(maxDate))
d3.select('#startday').text(fullDayNames[0] + '-')
d3.select('#endday').text(fullDayNames[6])
d3.select('#starttime').text(formatTitleTime(0))
d3.select('#endtime').text(formatTitleTime(24))
d3.selectAll("#total").text(formatNumber(cf.groupAll().reduceSum(function(d) {return d.value}).value()));
d3.selectAll("#numbikers").text(formatNumber(cf.groupAll().reduceSum(function(d) {return d.value}).value()));
d3.selectAll("#percent").text(formatPercent(all.reduceSum(function(d) {return d.value}).value()/cf.groupAll().reduceSum(function(d) {return d.value}).value()));

// Array of charts to make
var charts = [
    barChart()
        .dimension(date)
        .group(dateBikers)
        .round(d3.time.day.round)
        .y(d3.scale.linear().range([0, height]).domain([0,maxDayBikers]))
        // .yreverse(d3.scale.linear().range([height,0]).domain([0,maxDayBikers]))
        .x(d3.time.scale()
        .domain([minDate,maxDate])
        .rangeRound([0, 1100])),
        
 	barChart()
        .dimension(hour)
        .group(hours)
    	.y(d3.scale.linear().range([0, height]).domain([0,maxHourBikers]))
        .yreverse(d3.scale.linear().range([height,0]).domain([0,maxDayBikers]))
        .x(d3.scale.linear()
        .domain([0, 24])
        .rangeRound([0, 10 * 24])), 
        
	barChart()
        .dimension(day)
        .group(days)
    	.y(d3.scale.linear().range([0, height]).domain([0,maxWeekdayBikers])) 
        .yreverse(d3.scale.linear().range([height,0]).domain([0,maxDayBikers])) 
        .x(d3.scale.linear()
        .domain([-.1,6.1])
        .rangeRound([0, 10 * 24])),    

];

// Assign listeners
var chart = d3.selectAll(".chart")
  .data(charts)
  .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });


// Render the total.

renderAll();

// Renders the specified chart or list.
function render(method) {
	d3.select(this).call(method);
}

// Whenever the brush moves, re-rendering everything.
function renderAll() {
	chart.each(render);
	d3.select("#active").text(formatNumber(all.reduceSum(function(d) {return d.value}).value()));

	d3.select("#numbikers").text(formatNumber(all.reduceSum(function(d) {return d.value}).value()));

	var total = Number(d3.select('#total').text().replace(/,/g, ''))
	 d3.selectAll("#percent")
	  .text(formatPercent(all.reduceSum(function(d) {return d.value}).value()/total));
}



  window.filter = function(filters) {
    filters.forEach(function(d, i) { charts[i].filter(d); });
    renderAll();
  };

  window.reset = function(i) {
    charts[i].filter(null);
     d3.selectAll("#percentage").text('')
    	d3.select('#startdate').text(formatTitleDate(minDate))
		d3.select('#enddate').text(formatTitleDate(maxDate))
		d3.select('#startday').text(fullDayNames[0] + '-')
    	d3.select('#endday').text(fullDayNames[6])
		d3.select('#starttime').text(formatTitleTime(0))
    	d3.select('#endtime').text(formatTitleTime(24))
    renderAll();
  };

  
// Charting function
  function barChart() {
    if (!barChart.id) barChart.id = 0;
    var margin = {top: 10, right: 10, bottom: 20, left: 50},
        x,
        y,
        // y = d3.scale.linear().range([300, 0]),
        id = barChart.id++,
        axis = d3.svg.axis().orient("bottom"),
        yaxis = d3.svg.axis().orient("left"),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group,
        round;
        
        //yaxis.scale(yreverse)
        console.log(axis.scale().range())
    if(barChart.id == 3) {
    	axis.tickFormat(function(d) {
    		return dayNames[d]
    	})
    }

    function chart(div) {
      var width = x.range()[1]

      div.each(function() {
        var div = d3.select(this),
            g = div.select("g");

        // Create the skeletal chart.
        if (g.empty()) {
          div.select(".title").append("a")
              .attr("href", "javascript:reset(" + id + ")")
              .attr("class", "reset")
              .text("reset")
              .style("display", "none");

          g = div.append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .attr('id', id)
            .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
              
              g.selectAll('.bar').data(group.all())
              		.enter().append('rect')
              		.attr('x', function(d) {return x(d.key)})
              		.attr('y', function(d) {return height - y(d.value)})
              		.attr('width', 1)
              		.attr('height', function(d) {return y(d.value)})
              		.attr('class', 'bar')


          g.append("g")
              .attr("class", "axis")
              .attr("transform", "translate(0," + height + ")")
              .call(axis);
              
        g.append("g")
              .attr("class", "axis")
              .attr("transform", "translate(0," + 0 + ")")
              .call(yaxis);

          // Initialize the brush component with pretty resize handles.
         var gBrush = g.append("g").attr("class", "brush").call(brush);
          gBrush.selectAll("rect").attr("height", height);
          gBrush.selectAll(".resize").append("path").attr("d", resizePath);
        }

        // Only redraw the brush if set externally.
        if (brushDirty) {
          brushDirty = false;
          g.selectAll(".brush").call(brush);
          div.select(".title a").style("display", brush.empty() ? "none" : null);
          if (brush.empty()) {
            g.selectAll("#clip-" + id + " rect")
                .attr("x", 0)
                .attr("width", width);
          } else {
            var extent = brush.extent();
            g.selectAll("#clip-" + id + " rect")
                .attr("x", x(extent[0]))
                .attr("width", x(extent[1]) - x(extent[0]));
          }
        }
        g.selectAll(".bar").attr('x', function(d) {return x(d.key)})
              		.attr('y', function(d) {return height - y(d.value)})
              		.attr('width', 1)
              		.attr('height', function(d) {return y(d.value)})
      });

      

      function resizePath(d) {
        var e = +(d == "e"),
            x = e ? 1 : -1,
            y = height / 3;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
      }
    }

    brush.on("brushstart.chart", function() {
      var div = d3.select(this.parentNode.parentNode.parentNode);
      div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function() {
    	 var total = Number(d3.select('#total').text().replace(/,/g, ''))
	 d3.selectAll("#percentage")
      .text(' (' + formatPercent(all.reduceSum(function(d) {return d.value}).value()/total) + ' of total)');

      var g = d3.select(this.parentNode),
          extent = brush.extent();
          if(this.parentNode.parentNode.id == 0) {
          	d3.select('#startdate').text(formatTitleDate(extent[0]))
			d3.select('#enddate').text(formatTitleDate(extent[1]))
          }
          else if(this.parentNode.parentNode.id == 1) {
          
           	d3.select('#starttime').text(formatTitleTime(extent[0]) + '-')
           	d3.select('#endtime').text(formatTitleTime(extent[1]))
          }
           else if(this.parentNode.parentNode.id == 2) {
          	var val2 = Math.ceil(extent[0])>Math.floor(extent[1]) ? Math.ceil(extent[0]) : Math.floor(extent[1]) 
           	d3.select('#startday').text(fullDayNames[Math.ceil(extent[0])] + '-')
           	d3.select('#endday').text(fullDayNames[val2])
          }
      if (round) g.select(".brush")
          .call(brush.extent(extent = extent.map(round)))
        .selectAll(".resize")
          .style("display", null);
      g.select("#clip-" + id + " rect")
          .attr("x", x(extent[0]))
          .attr("width", x(extent[1]) - x(extent[0]));
      dimension.filterRange(extent);
    });

    brush.on("brushend.chart", function() {
      if (brush.empty()) {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", "none");
        div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
        dimension.filterAll();
        d3.selectAll("#percentage").text('')
    	d3.select('#startdate').text(formatTitleDate(minDate))
		d3.select('#enddate').text(formatTitleDate(maxDate))
		d3.select('#startday').text(fullDayNames[0] + '-')
    	d3.select('#endday').text(fullDayNames[6])
		d3.select('#starttime').text(formatTitleTime(0))
    	d3.select('#endtime').text(formatTitleTime(24))
      }
    });

    chart.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return chart;
    };

    chart.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      axis.scale(x);
      brush.x(x);
      return chart;
    };

    chart.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      var axisScale = d3.scale.linear().range([y.range()[1], y.range()[0]]).domain([y.domain()[0], y.domain()[1]])
      console.log(y.range(), axisScale.range())
      yaxis.scale(axisScale)
      return chart;
    };
    
    chart.yreverse = function(_) {
    	// console.log('yreverse', _.range())
      if (!arguments.length) return yreverse;
      yreverse = _;
      // yaxis.scale(yreverse)
      return chart;
    };

    chart.dimension = function(_) {
      if (!arguments.length) return dimension;
      dimension = _;
      return chart;
    };

    chart.filter = function(_) {

      if (_) {
        brush.extent(_);
        dimension.filterRange(_);
      } else {
        brush.clear();
        dimension.filterAll();
      }
      brushDirty = true;
      return chart;
    };

    chart.group = function(_) {
      if (!arguments.length) return group;
      group = _;
      return chart;
    };

    chart.round = function(_) {
      if (!arguments.length) return round;
      round = _;
      return chart;
    };

    return d3.rebind(chart, brush, "on");
  }
});
