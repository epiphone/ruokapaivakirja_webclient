"use strict";

angular.module("app.controllers", [])

// Login
.controller("LoginCtrl", function($scope, $http, $location, API, UserService) {
    $scope.login = function(username, password) {
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
    }
})

// Index
.controller("IndexCtrl", function($scope, $location, API, UserService) {
    if (!UserService.isLoggedIn()) {
        $location.path("/login");
    }
})


// Search foods, list results
.controller("FoodSearchCtrl", function($scope, $http, $timeout) {
    $scope.loading = false;
    var keyPressIndex = 0;

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
    }
})

// View single food
.controller("FoodCtrl", function($scope, $http, $routeParams) {
    var url = "http://toimiiks.cloudapp.net/api/json/foods/" + $routeParams.fid;
    $http.get(url).success(function(data){
        console.log(url);
        $scope.fid = $routeParams.fid;
        $scope.food = data.data;
    })
});
