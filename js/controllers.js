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
    $scope.order = "date";
    $scope.reverse = true;

    var params = {
        start: "20130101",
        end: "20130606"
    };

    var initialDate = new Date(),
    date = {
        year: initialDate.getYear(),
        month: initialDate.getMonth(),
        day: initialDate.getDate()
    };

    // Configure slider
    $(function() {
        $("#slider").slider({
            range: true,
            min: 0,
            max: 365,
            values: [359, 365],
            slide: function(event, ui) {
                $scope.slider.min = new Date(date.year, date.month, date.day - (365-ui.values[0]));
                $scope.slider.max = new Date(date.year, date.month, date.day - (365-ui.values[1]));
                // Values change outside Angular's $scope, so we need to call $apply manually:
                $scope.$apply();
            }
        });
        // Initial values
        $scope.slider = {
            min: new Date(date.year, date.month, date.day - (365-359)),
            max: new Date(date.year, date.month, date.day)
        };
    });

    $(function() {
        $("#slider").slider();
    });

    API.fetchSigned("/user/bites", "GET", params)
    .then(function(result){
        if (result.status == "success") {
            $scope.bites = result.data;
        } else {
            console.log(JSON.stringify(result));
        }
    },function(error) {
        console.log("ERROR=" + JSON.stringify(error));
    });

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
})


// Search foods, list results, show food details
.controller("FoodSearchCtrl", function($scope, $http, $timeout, $window, API) {
    $scope.loading = false;
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
            .success(function(data) {
                $scope.result = data;
                $scope.loading = false;
            })
            .error(function(data) {
                console.log("error data=" + data);
                $scope.result = "http error";
                $scope.loading = false;
            });
        }, 600);
    };

    // Show food details
    $scope.select = function(fid){
        $scope.isFoodLoading = true;
        $scope.amount = 100;  // default portion size is 100g
        var url = "http://toimiiks.cloudapp.net/api/json/foods/" + fid;

        $http.get(url).success(function(response){
            console.log("$scope.amount=" + $scope.amount);
            $scope.food = response.data;
            $scope.isFoodLoading = false;
            $window.scrollTo(0, 0);
        });
    };

    $scope.openModal = function() {
        var date = new Date();
        console.log("$scope.amount=" + $scope.amount);
        $scope.addStatus = undefined;
        $scope.date = date.getDate() + "." + date.getMonth() + "." + date.getFullYear();
        $scope.modalIsOpen = true;
    };

    $scope.closeModal = function() {
        $scope.modalIsOpen = false;
    };

    $scope.modalOptions = {
        backdropFade: true,
        dialogFade: true
    };

    $scope.addFood = function() {
        var dateParts = $scope.date.split("."),
        day = dateParts[0].length == 1 ? "0" + dateParts[0] : dateParts[0],
        month = dateParts[1].length == 1 ? "0" + dateParts[1] : dateParts[1],
        year = dateParts[2].length == 2 ? "20" + dateParts[2] : dateParts[2],
        data = {
            fid: $scope.food["_id"],
            amount: $scope.amount,
            date: year + month + day
        };
        $scope.addStatus = "loading";

        API.fetchSigned("/user/bites", "POST", data)
        .then(function(result){
            if (result.status == "success") {
                $scope.addStatus = "success";
            } else {
                $scope.addStatus = "error";
            }
        },function(error) {
            console.log("ERROR=" + JSON.stringify(error));
            $scope.addStatus = "error";
        });
    };
});
