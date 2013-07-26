"use strict";

angular.module("app.controllers")

// Search foods, list results, show food details
.controller("FoodSearchCtrl", function($scope, $http, $timeout, $window, API) {
    $scope.bite = {amount: 100};  // Initial portion size is 100g
    var keyPressIndex = 0;

    // Search foods, list results
    $scope.search = function(query){
        keyPressIndex++;
        if ($scope.queryLoading || query.length < 4) {
            return;
        }

        var savedKeyPressIndex = keyPressIndex;
        $timeout(function() {
            if (savedKeyPressIndex < keyPressIndex) {
                return;
            }
            $scope.queryLoading = true;

            API.fetch("/foods?q=" + encodeURI(query))
            .success(function(response) {
                if (response.status == "success") {
                    $scope.results = response.data;
                    $scope.activeTab = "results";
                } else {
                    console.log("FOOD QUERY ERROR=" + JSON.stringify(response));
                }
                $scope.queryLoading = false;
            })
            .error(function(response) {
                console.log("FOOD QUERY ERROR=" + JSON.stringify(response));
                $scope.queryLoading = false;
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

    // Modal configuration and methods  // TODO into a directive
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
        var date = $scope.selectedDate;
        console.log("$scope.selectedDate=" + $scope.selectedDate);

        if (!date) {
            alert("Valitse päivämäärä");
            return;
        }

        var data = {
            fid: $scope.food["_id"],
            amount: $scope.bite.amount,
            date: date
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

        $scope.favouriteLoading = true;
        API.fetchSigned("/user/favs/" + fid, "POST")
        .success(function(response) {
            if (response.status == "success") {
                $scope.favourites.push({fid: fid, name: name});
            } else {
                console.log("ADD FAVOURITE ERROR=" + JSON.stringify(response));
            }
            $scope.favouriteLoading = false;
        })
        .error(function(response) {
            console.log("ADD FAVOURITE ERROR=" + JSON.stringify(response));
            $scope.favouriteLoading = false;
        });
    };

    $scope.removeFavourite = function(fid) {
        $scope.favouriteLoading = true;
        API.fetchSigned("/user/favs/" + fid, "DELETE")
        .success(function(response) {
            if (response.status == "success") {
                $scope.favourites = $scope.favourites.filter(function(obj) {
                    return obj.fid != fid;
                });
            } else {
                console.log("REMOVE FAVOURITE ERROR=" + JSON.stringify(response));
            }
            $scope.favouriteLoading = false;
        })
        .error(function(response) {
            console.log("REMOVE FAVOURITE ERROR=" + JSON.stringify(response));
            $scope.favouriteLoading = false;
        });
    };

    $scope.getTopFoods = function() {
        API.fetch("/topfoods")
        .success(function(response){
            if (response.status == "success") {
                $scope.topFoods = response.data;
            } else {
                console.log("TOP10 ERROR=" + JSON.stringify(response));
            }
        })
        .error(function(response) {
            console.log("TOP10 ERROR=" + JSON.stringify(response));
        });
    };

    $scope.getFavourites();
    $scope.getTopFoods();
});