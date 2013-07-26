/*
Ruokapäiväkirja web client app
Aleksi Pekkala (aleksi.v.a.pekkala@student.jyu.fi)
*/

// "Strict Mode is a new feature in ECMAScript 5 that allows you to place a program,
// or a function, in a "strict" operating context. This strict context prevents certain
// actions from being taken and throws more exceptions."
"use strict";

angular.module("app.controllers", []);

// Declare app level module which depends on filters, and services
angular.module("app", ["app.filters", "app.services", "app.directives", "app.controllers"])
.config(function($routeProvider, $httpProvider) {

    // Routing
    $routeProvider.when("/", {templateUrl: "partials/index.html", controller: "IndexCtrl"});
    $routeProvider.when("/login", {templateUrl: "partials/login.html", controller: "LoginCtrl"});
    $routeProvider.when("/dates/:date", {templateUrl: "partials/date.html", controller: "DateCtrl"});
    $routeProvider.when("/foods", {templateUrl: "partials/foods.html", controller: "FoodSearchCtrl"});
    $routeProvider.when("/goals", {templateUrl: "partials/goals.html", controller: "GoalsCtrl"});

    $routeProvider.otherwise({redirectTo: "/"});

    // Enable CORS
    $httpProvider.defaults.useXDomain = true;
    delete $httpProvider.defaults.headers.common["X-Requested-With"];

    // Set HTTP data encoding; by default, Angular uses JSON encoding
    $httpProvider.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded;charset=utf-8";
})

.run(function($rootScope, $location, UserService) {
    /**
     * The following rules are enforced on each route change event:
     * 1) Redirect to login page if an unauthenticated user tries to access a restricted location.
     * 2) Redirect to goals page if a user hasn't set her goals.
     */
    $rootScope.$on("$routeChangeStart", function (event, next, current) {
        if (!UserService.isLoggedIn() && next.controller != "LoginCtrl") {
            $location.path("/login");
        } else if (!UserService.getGoals() && ["LoginCtrl", "GoalsCtrl"].indexOf(next.controller) < 0) {
            $location.path("/goals");
        }
    });
});
