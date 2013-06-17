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

    // Reititys
    $routeProvider.when("/", {templateUrl: "partials/index.html", controller: "IndexCtrl"});
    $routeProvider.when("/login", {templateUrl: "partials/login.html", controller: "LoginCtrl"});
    $routeProvider.when("/foodsearch", {templateUrl: "partials/foodsearch.html", controller: "FoodSearchCtrl"});
    $routeProvider.when("/food/:fid", {templateUrl: "partials/food.html", controller: "FoodCtrl"});

    $routeProvider.otherwise({redirectTo: "/"});

    // Sallitaan CORS
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common["X-Requested-With"];
});
