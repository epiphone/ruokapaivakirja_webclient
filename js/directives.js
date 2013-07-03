/*global d3, $*/
"use strict";

/* Directives */


angular.module("app.directives", [])

/**
 * Datepicker that binds to the given variable.
 */
 .directive("datepicker", function($timeout) {
    return {
        restrict: "A",

        scope: {
            bind: "="
        },

        link: function(scope, element, attrs) {
            // Initialize datepicker
            $(element[0]).datepicker({
                defaultDate: new Date(),
                dateFormat: "yymmdd",
                dayNamesMin: ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"],
                monthNames: ["Tammi", "Helmi", "Maalis", "Huhti", "Touko", "Kesä", "Heinä", "Elo", "Syys", "Loka", "Marras", "Joulu"],
                onSelect: function(dateText, obj) {
                    scope.$apply(function() {
                        scope.bind = dateText;
                    });
                }
            });

            // Set initial date TODO better way for date parsing?
            var initialDate = $(element[0]).datepicker("getDate"),
            dt = {
                d: initialDate.getDate().toString(),
                m: (initialDate.getMonth() + 1).toString(),
                y: initialDate.getFullYear().toString()
            };

            dt.d = dt.d.length == 1 ? "0" + dt.d : dt.d;
            dt.m = dt.m.length == 1 ? "0" + dt.m : dt.m;

            scope.bind = "" + dt.y + dt.m + dt.d;
        }
    };
})

/**
 * Slider with a single handle.
 * TODO: combine slider directives
 */
 .directive("slider", function($compile, $timeout) {
    return {
        restrict: "A",

        scope: {
            bind:    "=",
            min:     "@",
            max:     "@",
            initial: "@",
            prefix:  "@",
            postfix: "@",
            displayValues: "="
        },

        link: function(scope, element, attrs) {
            var min, max;
            if (scope.displayValues) {
                min = 0;
                max = scope.displayValues.length - 1;
            } else {
                min = parseInt(scope.min, 10) || 0;
                max = parseInt(scope.max, 10) || 100;
            }
            var initial = parseInt(scope.initial, 10) || Math.floor(max / 2);
            var prefix = scope.prefix ? scope.prefix + " " : "";
            var postfix = scope.postfix ? " " + scope.postfix : "";
            scope.bind = initial;

            $(element[0]).slider({
                min: min,
                max: max,
                value: initial,
                slide: function(event, ui) {
                    scope.$apply(function() {
                        scope.bind = ui.value;
                    });
                },
                start: function(event, ui) {
                    element.find(".handle-tooltip").toggleClass("appeared");
                },
                stop: function(event, ui) {
                    element.find(".handle-tooltip").toggleClass("appeared");
                }
            });

            // Append tooltip:
            var handle = $(element[0]).children(".ui-slider-handle");
            var html = "<div class='handle-tooltip'><div class='handle-tooltip-arrow'>" +
            "</div><div class='handle-tooltip-inner'></div></div>";
            handle.html(html);
            if (scope.displayValues) {
                $(handle[0]).find(".handle-tooltip-inner:eq(0)")
                .html($compile("<span>" + prefix + "{{displayValues[bind]}}" + postfix + "</span>")(scope));
            } else {
                $(handle[0]).find(".handle-tooltip-inner:eq(0)")
                .html($compile("<span>" + prefix + "{{bind}}" + postfix + "</span>")(scope));
            }
            var tooltip = $(element[0]).find(".handle-tooltip");

            // Center tooltip, use $timeout to let the DOM render first:
            $timeout(function(){
                tooltip.css("margin-left", -(tooltip.outerWidth() / 2) + (handle.outerWidth() / 2));
            });

            // This is called when the bound data changes...
            scope.$watch("bind", function(newData) {
                element.slider("value", newData);

            }, true);
        }
    };
})


/**
 * Slider with two handles and a date range.
 * When handles are moved, "min" and "max" properties of the bound object
 * change accordingly.
 */
 .directive("dateslider", function($compile, $timeout) {
    return {
        restrict: "A",

        scope: {
            bind:       "=",
            maxValue:   "@"
        },

        link: function(scope, element, attrs) {
            var maxValue = scope.maxValue || 30;
            var today = new Date(new Date().toDateString());
            console.log("scope.bind.min=" + scope.bind.min);
            var min = maxValue - Math.abs(today.getDate() - scope.bind.min.getDate());
            var max = maxValue - Math.abs(today.getDate() - scope.bind.max.getDate());

            $(element[0]).slider({
                range: true,
                min: 0,
                max: maxValue,
                values: [min, max],
                slide: function(event, ui) {
                    scope.$apply(function() {
                        scope.bind.min.setTime(today.getTime() - 86400000 * (maxValue-ui.values[0]));
                        scope.bind.max.setTime(today.getTime() - 86400000 * (maxValue-ui.values[1]));
                    });
                }
            });

            // Append tooltips:
            var handles = $(element[0]).children(".ui-slider-handle");
            var html = "<div class='handle-tooltip'><div class='handle-tooltip-arrow'>" +
            "</div><div class='handle-tooltip-inner'></div></div>";
            $(handles).html(html);
            var tooltipInners = $(handles).find(".handle-tooltip-inner");
            $(tooltipInners[0]).html($compile("<span>{{bind.min|date:'d.M.yy'}}</span>")(scope));
            $(tooltipInners[1]).html($compile("<span>{{bind.max|date:'d.M.yy'}}</span>")(scope));

            // Center tooltips:
            var tooltips = $(handles).find(".handle-tooltip");
            $timeout(function(){
                tooltips.css("margin-left", function(i) {
                    return -($(tooltips[i]).outerWidth() / 2) + ($(handles[i]).outerWidth() / 2);
                });
            });
        }
    };
})


/**
 * A responsive linechart with multiple lines and an area.
 * Usage: <div linechart bind="data" interpolation="linear"></div>
 */
 .directive("linechart", function($window) {
    return {
        restrict: "A",  // directive is defined as an attribute to an element

        scope: {
            bind:          "=",
            interpolation: "="
        },

        link: function(scope, element, attrs) {
            var data = null;
            var margin = {top: 20, right: 40, bottom: 30, left: 40};
            var parseDate = d3.time.format("%Y-%m-%dT%H:%M:%S").parse;

            // Create scales
            var x = d3.time.scale();
            var y = d3.scale.linear();
            var yKcal = d3.scale.linear();

            // Create axes
            var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(d3.time.days, 1)
            .tickFormat(d3.time.format("%-d.%-m"));

            var yLeftAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(6);

            var yRightAxis = d3.svg.axis()
            .scale(yKcal)
            .orient("right")
            .ticks(6);

            // Create line & area generators
            var line = d3.svg.line()
            .x(function(d) { return x(parseDate(d.date)); })
            .y(function(d) { return y(d.value); })
            .interpolate(attrs.interpolation ? attrs.interpolation : "linear");

            var area = d3.svg.area()
            .x(function(d) { return x(parseDate(d.date)); })
            .y1(function(d) { return yKcal(d.value); });

            // Append root svg element
            var svg = d3.select(element[0])
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .append("g")
            .attr("class", "chartContainer")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Append the axes
            svg.append("g")
            .attr("class", "x axis");

            svg.append("g")
            .attr("class", "y left axis");

            svg.append("g")
            .attr("class", "y right axis");

            // Append the axis labels
            svg.append("text")
            .attr("x", 10)
            .attr("y", 10)
            .attr("class", "axis-label y left")
            .style("text-anchor", "middle")
            .style("display", "none")
            .text("g");

            svg.append("text")
            .attr("class", "axis-label y right")
            .attr("x", -20)
            .attr("y", 10)
            .style("text-anchor", "middle")
            .style("display", "none")
            .text("kcal");

            // This is called when the bound data changes...
            scope.$watch("bind", function(newData) {
                data = newData;
                update(true);
            }, true);

            // ...and this when the window is resized
            var resizeTimer;
            angular.element($window).bind("resize", function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(function(){
                    update(false);
                }, 100);
            });

            /** Resets the chart data, resizes the chart */
            function update(init) {
                if (!data) {
                    return;
                }

                // Parse new data
                var entries = d3.entries(data.entries);
                var entriesWithoutKcal = entries.filter(function(d) { return d.key != "kcal"; });

                // Read container size, update chart size accordingly
                var chartWidth = element[0].getBoundingClientRect().width - margin.left - margin.right;
                var chartHeight = element[0].getBoundingClientRect().height - margin.top - margin.bottom;

                x.domain([data.minDate, data.maxDate])
                .range([0, chartWidth]);

                y.domain([0, d3.max(entriesWithoutKcal, function(d) {
                    return d3.max(d.value, function(e) { return e.value; });
                })])
                .range([chartHeight, 0]);

                yKcal.domain([0, d3.max(data.entries.kcal, function(d) {
                    return d.value;
                })])
                .range([chartHeight, 0]);

                svg.attr("width", chartWidth + margin.left + margin.right)
                .attr("height", chartHeight + margin.top + margin.bottom);

                // If updating chart, animate the axes, otherwise just enter
                var t = init ? svg : svg.transition().duration(750);


                // AXES
                t.select(".x")
                .attr("transform", "translate(0," + chartHeight + ")")
                .call(xAxis);

                t.select(".y.left")
                .call(yLeftAxis);

                t.select(".y.right")
                .attr("transform", "translate(" + chartWidth + ",0)")
                .call(yRightAxis);


                // AXIS LABELS
                t.select(".axis-label.right")
                .attr("transform", "translate(" + chartWidth + ",0)");

                t.selectAll(".axis-label")
                .style("display", "block");


                // AREA
                area.y0(chartHeight);
                var areas = svg.selectAll(".area")
                .data([data.entries.kcal]);

                areas.transition()
                .duration(750)
                .attr("d", area);

                areas.enter().append("path")
                .attr("class", "area fill")
                .attr("d", area)
                .attr("transform", "translate(0," + chartHeight + "), scale(1, 0)")
                .transition()
                .duration(2000)
                .ease("elastic")
                .attr("transform", "translate(0, 0), scale(1, 1)");


                // LINES
                var lines = svg.selectAll(".line")
                .data(entriesWithoutKcal);

                lines.attr("stroke-dasharray", "none")
                .transition()
                .duration(750)
                .attr("d", function(d) { return line(d.value); });

                lines.enter().append("path")
                .attr("class", function(d) { return "line " + d.key; })
                .attr("d", function(d) { return line(d.value); })
                .attr("stroke-dasharray", function(d) { return  "0 " + this.getTotalLength(); })
                .transition()
                .duration(1000)
                .delay(function(d, i) { return i * 100; })
                .attr("stroke-dasharray", function(d) { return this.getTotalLength() + " " + this.getTotalLength(); });
            }

            svg.selectAll("text")
            .style("visibility", "visible");
        }
    };
});
