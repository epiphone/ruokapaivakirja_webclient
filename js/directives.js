/*global d3*/
"use strict";

/* Directives */


angular.module("app.directives", [])

/**
 * Directive for creating responsive linecharts.
 * Based on dangle.js (https://github.com/fullscale/dangle)
 *
 * Usage: <html>...<linechart bind="data" />
 * The chart will listen for the binded variable in the current scope
 * and update accordingly.
 * Example data:
 * data = {minDate: Date, maxDate: Date, lines: [line1, line2]}, where
 * line1 = {class: "line-red", domain: [0, 100], entries: entries1}, where
 * entries1 = [{date: myDate1, value: 200}, {date: myDate2, value: 200}]
 */
 .directive("linechart", function($window) {
    return {
        restrict: "A",

        scope: {
            width:       "=",
            height:      "=",
            bind:        "=",
            interpolation: "="
        },

        link: function(scope, element, attrs) {
            var data = null;
            var margin = {top: 20, right: 20, bottom: 30, left: 30};
            var prevWidth = 0;
            var prevHeight = 0;
            var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S").parse;

            // Create scales
            var x = d3.time.scale();
            var y = d3.scale.linear();

            // Create axes
            var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(d3.time.days, 1)
            .tickFormat(d3.time.format("%-d.%-m"));

            var yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

            // Create line generator
            var line = d3.svg.line()
            .x(function(d) { return x(parseDate(d.date)); })
            .y(function(d) { return y(d.value); })
            .interpolate("cardinal");

            // ROOT SVG ELEMENT
            var svg = d3.select(element[0])
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("class", "chartContainer")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // insert the x axis (no data yet)
            svg.append("g")
            .attr("class", "x axis");

            svg.append("g")
            .attr("class", "y axis");

            // svg.append("g")
            // .attr("class", "x axis")
            // .attr("transform", "translate(0," + height + ")")
            // .call(xAxis);

            // // insert the x axis (no data yet)
            // svg.append("g")
            // .attr("class", "area y axis " + klass)
            // .call(yAxis)
            // .append("text")
            // .attr("transform", "rotate(-90)")
            // .attr("y", 6)
            // .attr("dy", ".71em")
            // .style("text-anchor", "end")
            // .text(label);

            // generate the line. Data is empty at link time
            // svg.append("path")
            // .datum([])
            // .attr("class", function(d){ return "line " + d.key; })
            // .attr("d", function(d){ return line(d.value); })
            // .attr("stroke", function(d) { return "green"; });

            // this is called when the bound data changes
            scope.$watch("bind", function(newData) {
                data = newData;
                update(true);
            }, true);

            scope.$watch("interpolation", function(newData) {
                if (!newData) { return; }
                line.interpolate(newData);

                svg.selectAll(".line")
                .data(d3.entries(data.entries))
                .transition()
                .duration(750)
                .attr("d", function(d) { return line(d.value); });
            });

            var resizeTimer;
            angular.element($window).bind("resize", function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function(){
                    update(false);
                }, 100);
            });

            function update(init) {
                if (!data) {
                    return;
                }
                console.log(data);
                var entries = d3.entries(data.entries);
                var chartWidth = element[0].getBoundingClientRect().width - margin.left - margin.right;
                var chartHeight = element[0].getBoundingClientRect().height - margin.top - margin.bottom;

                // use that data to build valid x,y ranges
                x.domain([data.minDate, data.maxDate])
                .range([0, chartWidth]);

                y.domain([0, d3.max(entries, function(d) {
                    return d3.max(d.value, function(e) { return e.value; });
                })])
                .range([chartHeight, 0]);

                svg.attr("width", chartWidth + margin.left + margin.right)
                .attr("height", chartHeight + margin.top + margin.bottom);

                var t = init ? svg : svg.transition().duration(750);

                t.select(".x")
                .attr("transform", "translate(0," + chartHeight + ")")
                .call(xAxis);

                t.select(".y")
                .call(yAxis);

                // Create lines
                var lines = svg.selectAll(".line")
                .data(entries);

                // Update existing lines
                lines
                .attr("stroke-dasharray", "none")
                .transition()
                .duration(750)
                .attr("d", function(d) { return line(d.value); });

                // Enter new lines
                lines.enter().append("path")
                .attr("class", function(d) { return "line " + d.key; })
                .attr("d", function(d) { return line(d.value); })
                .attr("stroke-dasharray", function(d) { return  "0 " + this.getTotalLength(); })
                .transition()
                .duration(1000)
                .ease("linear")
                .attr("stroke-dasharray", function(d) { return this.getTotalLength() + " " + this.getTotalLength(); });

                // create the transition
                // var t = svg.transition().duration(duration);

                // feed the current data to our area/line generators
                // t.selectAll(".line").attr("d", line(entries));
                // svg.selectAll(".line").attr("d", function(d) { return line(d.value); });

                // svg.selectAll(".line")
                // .data(entries)
                // .enter().append("path")
                // .attr("class", function(d){ return "line " + d.key; })
                // .attr("d", function(d){ return line(d.value); });

                // update our x,y axis based on new data values
                // t.select(".x").call(xAxis);
                // t.select(".y").call(yAxis);

            }
        }
    };
});
