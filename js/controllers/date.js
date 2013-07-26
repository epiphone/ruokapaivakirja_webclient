"use strict";

angular.module("app.controllers")

.controller("DateCtrl", function ($scope, $routeParams, $location, API, UserService) {
    var date = $routeParams.date;
    $scope.date = dateFromStr(date);
    if (!date) {
        $location.path("/");
    }

    /** "yyyyMMdd" -> Date object */
    function dateFromStr(dateStr) {
        return new Date(dateStr.substring(0,4), dateStr.substring(4,6),
            dateStr.substring(6));
    }

    function getBites() {
        API.fetchSigned("/user/bites/" + date, "GET")
        .success(function(response) {
            if (response.status == "success") {
                $scope.bites = response.data;
            } else {
                $location.path("/");
            }
        })
        .error(function(response) {
            $location.path("/");
        });
    }

    $scope.removeBite = function(bite) {
        bite.loading = true;
        var biteId = bite["_id"];
        API.fetchSigned("/user/bites/" + biteId, "DELETE")
        .success(function(response) {
            if (response.status == "success") {
                $scope.bites.splice($scope.bites.indexOf(bite), 1);
            } else {
                alert("Poistaminen epäonnistui!");
                console.log("BITE REMOVE ERROR=" + JSON.stringify(response));
                bite.loading = false;
            }
        })
        .error(function(response) {
            alert("Poistaminen epäonnistui!");
            console.log("BITE REMOVE ERROR=" + JSON.stringify(response));
            bite.loading = false;
        });
    };

    getBites();
});