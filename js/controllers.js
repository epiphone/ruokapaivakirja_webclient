 /* global d3, $, alert */
 "use strict";

 angular.module("app.controllers", [])

// Login
.controller("LoginCtrl", function ($scope, $http, $location, API, UserService) {
    $scope.login = function (username, password) {
        UserService.setCredentials(username, password);
        API.fetchSigned("/user/favs")
        .success(function(response) {
            if (response.status == "success") {
                UserService.isLoggedIn(true);
                $location.path("/");
            } else {
                $scope.message = "Virheellinen käyttäjätunnus tai salasana";
                UserService.logout();
            }
        })
        .error(function(data) {
            console.log("LOGIN ERROR=" + JSON.stringify(data));
            UserService.logout();
            $scope.message = "Kirjautuminen epäonnistui";
        });
    };
})

// Index - list bites
.controller("IndexCtrl", function($scope, $location, API, UserService) {
    // Initial sort order for bites
    $scope.order = "date";
    $scope.reverse = true;

    // Date object --> "yyyyMMdd"
    function formatDate(d) {
        var monthStr = (d.getMonth() + 1).toString(),
        month = monthStr.length == 1 ? "0" + monthStr : monthStr,
        day = d.getDate().toString().length == 1 ? "0" + d.getDate() : d.getDate();

        return d.getFullYear() + month + day;
    }

    // Slider settings
    var initialDate = new Date(new Date().toDateString()),
    date = {
        year: initialDate.getFullYear(),
        month: initialDate.getMonth(),
        day: initialDate.getDate()
    },
    sliderMaxValue = 30;

    // Configure slider
    $(function() {
        $("#slider").slider({
            range: true,
            min: 0,
            max: sliderMaxValue,
            values: [sliderMaxValue-6, sliderMaxValue],
            slide: function(event, ui) {
                $scope.$apply(function() {
                    $scope.slider.min.setTime(initialDate.getTime() - 86400000 * (sliderMaxValue-ui.values[0]));
                    $scope.slider.max.setTime(initialDate.getTime() - 86400000 * (sliderMaxValue-ui.values[1]));
                });
            }
        });
    });

    // Initial values
    $scope.slider = {
        min: new Date(date.year, date.month, date.day - (sliderMaxValue-(sliderMaxValue-6))),
        max: new Date(date.year, date.month, date.day)
    };

    $(function() {
        $("#slider").slider();
    });

    $scope.getBites = function() {
        $scope.bitesLoading = true;
        var params = {
            start: formatDate($scope.slider.min),
            end: formatDate($scope.slider.max)
        };

        API.fetchSigned("/user/bites", "GET", params)
        .success(function(response) {
            if (response.status == "success") {
                $scope.bites = response.data;
                $scope.drawChart();
            } else {
                console.log("BITES ERROR=" + JSON.stringify(response));
            }
            $scope.bitesLoading = false;
        })
        .error(function(response) {
            console.log("BITES ERROR=" + JSON.stringify(response));
            $scope.bitesLoading = false;
        });
    };

    $scope.removeBite = function(biteId) {
        API.fetchSigned("/user/bites/" + biteId, "DELETE")
        .success(function(response) {
            if (response.status == "success") {
                $scope.bites = $scope.bites.filter(function(obj) {
                    return obj["_id"] !== biteId;
                });
            } else {
                alert("Poistaminen epäonnistui!");
                console.log("BITE REMOVE ERROR=" + JSON.stringify(response));
            }
        })
        .error(function(response) {
            alert("Poistaminen epäonnistui!");
            console.log("BITE REMOVE ERROR=" + JSON.stringify(response));
        });
    };

    // "yyyyMMdd" --> Date object
    function parseDate(dt) {
        return new Date(dt.substr(0, 4), dt.substr(4, 2) - 1, dt.substr(6, 2));
    }
    var interpolations = [
    "linear",
    "cardinal",
    "monotone"];

    $scope.changeInterpolation = function() {  // TODO remove
        $scope.interpolation = interpolations.shift();
        interpolations.push($scope.interpolation);
    };

    $scope.drawChart = function() {
        var data = {protein: [], carbs: [], fat: []},
        bite,
        foundMatch,
        maxValue = 0;

        // Process data
        for (var i in $scope.bites) {
            bite = $scope.bites[i];
            foundMatch = false;

            for (var j in data.protein) {
                if (data.protein[j].date == bite.date) {
                    data.protein[j].value += bite.protein;
                    data.carbs[j].value += bite.carbs;
                    data.fat[j].value += bite.fat;

                    foundMatch = true;
                    break;
                }
            }

            if (!foundMatch) {
                data.protein.push({date: bite.date, value: bite.protein});
                data.fat.push({date: bite.date, value: bite.fat});
                data.carbs.push({date: bite.date, value: bite.carbs});
            }
        }

        var chartData = {
            entries: data,
            minDate: new Date($scope.slider.min),
            maxDate: new Date($scope.slider.max)
        };
        $scope.chartData = chartData;
        // var entries = d3.entries(chartData.entries);

        // var margin = {top: 20, right: 20, bottom: 30, left: 50};
        // var sourceData, xScale, yScale, line;
        // var prevChartWidth = 0, prevChartHeight = 0;
        // var updateTransitionMS = 750; // milliseconds

        // // SCALES
        // xScale = d3.time.scale()
        // .domain([chartData.minDate, chartData.maxDate]);

        // yScale = d3.scale.linear()
        // .domain([0, d3.max(entries, function(d) {
        //     return d3.max(d.value, function(e) { return e.value; });
        // })]);

        // // LINE FUNCTION
        // line = d3.svg.line()
        // .x(function(d) { return xScale(new Date(d.date)); })
        // .y(function(d) { return yScale(d.value); })
        // .interpolate("cardinal");

        // // BASE SVG ELEMENT
        // var svg = d3.select("#chartContainer").append("svg")
        // .attr("width", "100%")
        // .attr("height", "100%")
        // .append("g")
        // .attr("class", "chartContainer")
        // .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // // AXES
        // svg.append("g")
        // .attr("class", "x axis");

        // svg.append("g")
        // .attr("class", "y axis");

        // var xAxis = d3.svg.axis()
        // .scale(xScale)
        // .orient("bottom");

        // var yAxis = d3.svg.axis()
        // .scale(yScale)
        // .orient("left");

        // updateChart(true);

        // // called for initial update and updates for resize
        // function updateChart(init) {
        //     // get the height and width subtracting the padding
        //     var chartWidth = document.getElementById('chartContainer').getBoundingClientRect().width - margin.left - margin.right;
        //     var chartHeight = document.getElementById('chartContainer').getBoundingClientRect().height - margin.top - margin.bottom;

        //     // only update if chart size has changed
        //     if ((prevChartWidth != chartWidth) || (prevChartHeight != chartHeight)) {
        //         prevChartWidth = chartWidth;
        //         prevChartHeight = chartHeight;

        //         //set the width and height of the SVG element
        //         svg
        //         .attr("width", chartWidth + margin.left + margin.right)
        //         .attr("height", chartHeight + margin.top + margin.bottom);

        //         // ranges are based on the width and height available so reset
        //         xScale.range([0, chartWidth]);
        //         yScale.range([chartHeight, 0]);

        //         if (init) {
        //             // if first run then just display axis with no transition
        //             svg.select(".x")
        //             .attr("transform", "translate(0," + chartHeight + ")")
        //             .call(xAxis);

        //             svg.select(".y")
        //             .call(yAxis);
        //         } else {
        //             // for subsequent updates use a transistion to animate the axis to the new position
        //             var t = svg.transition().duration(updateTransitionMS);

        //             t.select(".x")
        //             .attr("transform", "translate(0," + chartHeight + ")")
        //             .call(xAxis);

        //             t.select(".y")
        //             .call(yAxis);
        //         }

        //         // LINES
        //         var lines = svg.selectAll(".line")
        //         .data(entries);

        //         // Update existing lines
        //         lines.transition()
        //         .duration(updateTransitionMS)
        //         .attr("d", function(d) { return line(d.value); });

        //         // Enter new lines
        //         lines.enter().append("path")
        //         .attr("class", function(d) { return "line " + d.key; })
        //         .attr("d", function(d) { return line(d.value); })
        //         .attr("stroke-dasharray", function(d) { return  "0 " + this.getTotalLength(); })
        //         // .attr("stroke-dashoffset", function(d) { return this.getTotalLength(); })
        //         .transition()
        //         .duration(1000)
        //         .ease("linear")
        //         // .attr("stroke-dashoffset", 0);
        //         .attr("stroke-dasharray", function(d) { return this.getTotalLength() + " " + this.getTotalLength(); });

        //     }
        // }

        // // look for resize but use timer to only call the update script when a resize stops
        // var resizeTimer;
        // window.onresize = function(event) {
        //     clearTimeout(resizeTimer);
        //     resizeTimer = setTimeout(function()
        //     {
        //       updateChart(false);
        //   }, 100);
        // };
    };


    // Load initial bites
    $scope.getBites();
})


// Search foods, list results, show food details
.controller("FoodSearchCtrl", function($scope, $http, $timeout, $window, API) {
    $scope.loading = false;
    $scope.bite = {amount: 100};  // Initial portion size is 100g
    var keyPressIndex = 0;

    // Search foods, list results
    $scope.search = function(query){
        keyPressIndex++;
        if ($scope.loading || query.length < 4) {
            return;
        }

        var savedKeyPressIndex = keyPressIndex;
        $timeout(function() {
            if (savedKeyPressIndex < keyPressIndex) {
                return;
            }
            $scope.loading = true;

            API.fetch("/foods?q=" + query)
            .success(function(response) {
                if (response.status == "success") {
                    $scope.results = response.data;
                } else {
                    console.log("FOOD QUERY ERROR=" + JSON.stringify(response));
                }
                $scope.loading = false;
            })
            .error(function(response) {
                console.log("FOOD QUERY ERROR=" + JSON.stringify(response));
                $scope.loading = false;
            });
        }, 600);
    };

    // Check whether given food is in favourites
    $scope.foodInFavourites = function(fid) {
        if ($scope.favourites === undefined || $scope.favourites == []) {
            return false;
        }
        return $scope.favourites.some(function(obj) {
            return obj.fid == fid;
        });
    };

    // Show food details
    $scope.selectFood = function(fid){
        $scope.isFoodLoading = true;

        API.fetch("/foods/" + fid)
        .success(function(response){
            if (response.status == "success") {
                $scope.food = response.data;
                $scope.isFoodLoading = false;
                $window.scrollTo(0, 0);
            } else {
                console.log("FOOD SELECT ERROR=" + JSON.stringify(response));
            }
            $scope.isFoodLoading = false;
        })
        .error(function(response) {
            console.log("FOOD SELECT ERROR=" + JSON.stringify(response));
        });
    };

    // Modal configuration and methods
    $("#modal").modal({show: false});

    $scope.openModal = function() {
        var date = new Date();
        $scope.addStatus = "started";  // started|loading|error|success
        $scope.bite.date = date.getDate() + "." + (date.getMonth() + 1) + "." + date.getFullYear();
        $("#modal").modal("show");
    };

    $scope.closeModal = function() {
        $("#modal").modal("hide");
    };

    $scope.addBite = function() {
        // Parse date into API's format (yyyyMMdd)
        var dateParts = $scope.bite.date.split("."),
        day = dateParts[0].length == 1 ? "0" + dateParts[0] : dateParts[0],
        month = dateParts[1].length == 1 ? "0" + dateParts[1] : dateParts[1],
        year = dateParts[2].length == 2 ? "20" + dateParts[2] : dateParts[2],

        data = {
            fid: $scope.food["_id"],
            amount: $scope.bite.amount,
            date: year + month + day
        };
        $scope.addStatus = "loading";

        API.fetchSigned("/user/bites", "POST", data)
        .success(function(response) {
            if (response.status == "success") {
                $scope.addStatus = "success";
            } else {
                $scope.addStatus = "error";
                console.log("BITE ADD ERROR=" + JSON.stringify(response));
            }
        })
        .error(function(response) {
            console.log("BITE ADD ERROR=" + JSON.stringify(response));
            $scope.addStatus = "error";
        });
    };

    $scope.getFavourites = function() {
        API.fetchSigned("/user/favs")
        .success(function(response) {
            if (response.status == "success") {
                $scope.favourites = response.data;
            } else {
                console.log("GET FAVOURITES ERROR=" + JSON.stringify(response));
            }
        }).error(function(response) {
            console.log("GET FAVOURITES ERROR=" + JSON.stringify(response.data));
        });
    };

    $scope.addFavourite = function(fid, name) {
        if ($scope.foodInFavourites(fid)) {
            return;
        }

        API.fetchSigned("/user/favs/" + fid, "POST")
        .success(function(response) {
            if (response.status == "success") {
                $scope.favourites.push({fid: fid, name: name});
            } else {
                console.log("ADD FAVOURITE ERROR=" + JSON.stringify(response));
            }
        })
        .error(function(response) {
            console.log("ADD FAVOURITE ERROR=" + JSON.stringify(response));
        });
    };

    $scope.removeFavourite = function(fid) {
        API.fetchSigned("/user/favs/" + fid, "DELETE")
        .success(function(response) {
            if (response.status == "success") {
                $scope.favourites = $scope.favourites.filter(function(obj) {
                    return obj.fid != fid;
                });
            } else {
                console.log("REMOVE FAVOURITE ERROR=" + JSON.stringify(response));
            }
        })
        .error(function(response) {
            console.log("REMOVE FAVOURITE ERROR=" + JSON.stringify(response));
        });
    };

    $scope.getFavourites();
});
