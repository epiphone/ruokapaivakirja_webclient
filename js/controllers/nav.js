"use strict";

angular.module("app.controllers")

// Navbar - used to hide nav buttons if the user isn't logged in
.controller("NavCtrl", function ($scope, $location, UserService) {
    $scope.loggedIn = function() { return UserService.isLoggedIn(); };

    $scope.navClass = function(link) {
        var path = $location.path();
        return link == path ? "disabled" : "";
    };
});

