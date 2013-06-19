 /* global d3 */
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
    var initialDate = new Date(),
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
                $scope.slider.min = new Date(date.year, date.month, date.day - (sliderMaxValue-ui.values[0]));
                $scope.slider.max = new Date(date.year, date.month, date.day - (sliderMaxValue-ui.values[1]));
                // Values change outside Angular's $scope, so we need to call $apply manually:
                $scope.$apply();
            }
        });
        // Initial values
        $scope.slider = {
            min: new Date(date.year, date.month, date.day - (sliderMaxValue-(sliderMaxValue-6))),
            max: new Date(date.year, date.month, date.day)
        };
    });

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

    $scope.drawChart = function() {
        $("#chart").empty();

        var margin = {top:20, right:20, bottom: 30, left:50},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

        var x = d3.time.scale()
        .domain([$scope.slider.min, $scope.slider.max])
        .range([0, width]);

        var y = d3.scale.linear()
        .domain([0, 4000])
        .range([height, 0]);

        var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(d3.time.days, 1)
        .tickFormat(d3.time.format("%d.%m"))
        .tickPadding(5);

        var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

        var line = d3.svg.line()
        .x(function(d) { return x(new Date(d.date)); })
        .y(function(d) { return y(d.kcal); });

        var svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Draw axes
        svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-50)");

        svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Energia (kcal)");

        // Group bites by date
        var data = [];
        for (var i in $scope.bites) {
            var bite = $scope.bites[i],
            foundMatch = false;
            for (var j in data) {
                if (data[j].date == bite.date) {
                    data[j].kcal += bite.kcal;
                    foundMatch = true;
                    break;
                }
            }

            if (!foundMatch) {
                data.push({date: bite.date, kcal: bite.kcal});
            }
        }

        // Draw line
        svg.append("path")
        .attr("d", line(data));
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
