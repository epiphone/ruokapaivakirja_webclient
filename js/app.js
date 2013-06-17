/*
Ruokapäiväkirja Web Client
Aleksi Pekkala
*/

// "Strict Mode is a new feature in ECMAScript 5 that allows you to place a program,
// or a function, in a "strict" operating context. This strict context prevents certain
// actions from being taken and throws more exceptions."
"use strict";

// Declare app level module which depends on filters, and services
angular.module("app", ["app.filters", "app.services", "app.directives", "app.controllers", "ui.bootstrap"])
.config(function($routeProvider, $httpProvider) {

    // Routing
    $routeProvider.when("/", {templateUrl: "partials/index.html", controller: "IndexCtrl"});
    $routeProvider.when("/login", {templateUrl: "partials/login.html", controller: "LoginCtrl"});
    $routeProvider.when("/foods", {templateUrl: "partials/foods.html", controller: "FoodSearchCtrl"});

    $routeProvider.otherwise({redirectTo: "/"});

    // Enable CORS
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common["X-Requested-With"];
})

.run(function($rootScope, $location, UserService) {
    // Redirect to login page if the user tries to access a restricted location
    $rootScope.$on("$locationChangeStart", function (event, next, current) {
        if (!UserService.isLoggedIn() && next.endsWith("#/login")) {
            console.log("Redirecting to login page.");
            $location.path("/login");
        }
    });
});
