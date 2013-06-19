"use strict";

angular.module("app.controllers", [])

// Login
.controller("LoginCtrl", function ($scope, $http, $location, API, UserService) {
    $scope.login = function (username, password) {
        UserService.setCredentials(username, password);
        API.fetchSigned("/user/favs")
        .then(function(result){
            if (result.status == "success") {
                UserService.isLoggedIn(true);
                $location.path("/");
            } else {
                $scope.message = "Virheellinen käyttäjätunnus tai salasana";
                UserService.logout();
            }
        },function(error) {
            console.log("ERROR=" + JSON.stringify(error));
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
        .then(function(result){
            if (result.status == "success") {
                $scope.bites = result.data;
                $scope.bitesLoading = false;
            } else {
                console.log(JSON.stringify(result));
                $scope.bitesLoading = false;
            }
        },function(error) {
            console.log("ERROR=" + JSON.stringify(error));
            $scope.bitesLoading = false;
        });
    };

    $scope.removeBite = function(biteId) {
        API.fetchSigned("/user/bites/" + biteId, "DELETE")
        .then(function(result){
            if (result.status == "success") {
                $scope.bites = $scope.bites.filter(function(obj) {
                    return obj["_id"] !== biteId;
                });
            } else {
                alert("Poistaminen epäonnistui");
                console.log(JSON.stringify(result));
            }
        },function(error) {
            alert("Poistaminen epäonnistui");
            console.log("ERROR=" + JSON.stringify(error));
        });
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
            var url = "http://toimiiks.cloudapp.net/api/json/foods?q=" + query;
            $http.get(url)
            .success(function(response) {
                $scope.results = response.data;
                console.log("$scope.result=" + JSON.stringify($scope.results));
                $scope.loading = false;
            })
            .error(function(data) {
                console.log("error data=" + data);
                $scope.results = "http error";
                $scope.loading = false;
            });
        }, 600);
    };

    // Show food details
    $scope.select = function(fid){
        $scope.isFoodLoading = true;
        var url = "http://toimiiks.cloudapp.net/api/json/foods/" + fid;

        $http.get(url).success(function(response){
            $scope.food = response.data;
            $scope.isFoodLoading = false;
            $window.scrollTo(0, 0);
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

    $scope.addFood = function() {
        // Parse date into API format (yyyyMMdd)
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
        .then(function(result) {
            if (result.status == "success") {
                $scope.addStatus = "success";
            } else {
                $scope.addStatus = "error";
            }
        }, function(error) {
            console.log("ERROR=" + JSON.stringify(error));
            $scope.addStatus = "error";
        });
    };
});
