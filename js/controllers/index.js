"use strict";

angular.module("app.controllers")

.controller("IndexCtrl", function($scope, $location, $timeout, API, UserService) {
    // Initial sort order for bites
    $scope.order = "date";
    $scope.reverse = true;
    $scope.goals = UserService.getGoals();

    /** Date object -> "yyyyMMdd" */
    function formatDate(d) {
        var monthStr = (d.getMonth() + 1).toString(),
        month = monthStr.length == 1 ? "0" + monthStr : monthStr,
        day = d.getDate().toString().length == 1 ? "0" + d.getDate() : d.getDate();

        return d.getFullYear() + month + day;
    }

    // Set slider handles' initial positions
    var today = new Date();
    $scope.slider = {
        min: new Date(today.getFullYear(), today.getMonth(), today.getDate() -15),
        max: new Date(today.getFullYear(), today.getMonth(), today.getDate())
    };

    $scope.getBites = function() {
        if (!$scope.slider) {
            return;
        }

        $scope.bitesLoading = true;
        var params = {
            start: formatDate($scope.slider.min),
            end: formatDate($scope.slider.max)
        };

        API.fetchSigned("/user/days", "GET", params)
        .success(function(response) {
            if (response.status == "success") {
                var date, dates = response.data;
                dates.forEach(function(d) {
                    date = new Date(d.date);
                    date.setHours(0);
                    d.date = date;
                    d.apiDate = formatDate(date);
                });

                $scope.dates = dates.sort(function(a,b){
                    return a.date - b.date;
                });

                $scope.datesOrder = "date";
                $scope.datesReverse = true;
                processChartData();
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

    /**
     * Initialize scope variables lineChartData and barChartData, which are
     * bound to the charts.
     */
     function processChartData() {
        var lineData = {protein: [], carbs: [], fat: [], kcal: []};
        var barData = [];
        var dateObj;
        var attr;

        var dates = $scope.dates;
        var goals = $scope.goals;

        for (var i in dates) {
            dateObj = $scope.dates[i];

            for (var j in Object.keys(lineData)) {
                attr = Object.keys(lineData)[j];
                lineData[attr].push({
                    date: dateObj.date,
                    value: dateObj[attr]});
            }

            barData.push({
                date: dateObj.date,
                amounts: [
                { name: "kcal", value: Math.floor(100 * dateObj.kcal / goals.kcal)},
                { name: "carbs", value: Math.floor(100 * dateObj.carbs / goals.carbs)},
                { name: "fat", value: Math.floor(100 * dateObj.fat / goals.fat)},
                { name: "protein", value: Math.floor(100 * dateObj.protein / goals.protein)}
                ]
            });
        }
        $scope.lineChartData = {
            entries: lineData,
            minDate: new Date($scope.slider.min),
            maxDate: new Date($scope.slider.max)
        };

        $scope.barChartData = {
            entries: barData,
            minDate: new Date($scope.slider.min),
            maxDate: new Date($scope.slider.max)
        };

        blockChartButtons();
    }

    /**
     * Blocks the buttons that hightlight chart lines or bars for a second,
     * so that a transition doesn't get interrupted by the user.
     */
    function blockChartButtons() {
        $scope.chartLoading = true;
        $timeout(function() { $scope.chartLoading = false; }, 1000);
    }

    $scope.toggleChart = function() {
        blockChartButtons();
        $scope.chartToShow = $scope.chartToShow == "linechart" ? "barchart" : "linechart";
    };

    // Load initial bites
    $scope.chartToShow = "linechart";
    $scope.getBites();
});