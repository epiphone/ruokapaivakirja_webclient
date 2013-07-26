"use strict";

angular.module("app.controllers")

// Login and registration
.controller("LoginCtrl", function ($scope, $http, $location, API, UserService) {
    $scope.loginTabSelected = true;

    /** Make an arbitrary request to test connecion, show error if failed. */
    $scope.establishServerConnection = function() {
        $scope.connectionStatus = "loading";
        API.fetch("/foods?q=makkara")
        .success(function() {
            $scope.connectionStatus = "connected";
        }).error(function() {
            $scope.connectionStatus = "failed";
        });
    };

    $scope.login = function(username, password) {
        $scope.loading = true;
        UserService.setCredentials(username, password);
        API.fetchSigned("/user")
        .success(function(response) {
            if (response.status == "success") {
                angular.element(".backstretch").remove();  // Remove login page background TODO: directive?
                UserService.setGoals(response.data.goals);
                UserService.setFavs(response.data.favs);
                UserService.isLoggedIn(true);
                $location.path("/");
            } else {
                $scope.message = "Virheellinen käyttäjätunnus tai salasana";
                UserService.logout();
                $scope.loading = false;
            }
        })
        .error(function(data) {
            console.log("LOGIN ERROR=" + JSON.stringify(data));
            UserService.logout();
            $scope.message = "Kirjautuminen epäonnistui";
            $scope.loading = false;
        });
    };

    $scope.register = function(form) {
        if (form.password != form.passwordAgain) {
            $scope.registerMessage = "Varmistus ei täsmää salasanaa";
            return;
        }

        var userApprovalGranted = window.confirm(
            "Huom! Tietojen säilymistä yms. ylläpitoa ei voida taata.");
        if (!userApprovalGranted) return;

        $scope.loading = true;
        UserService.setCredentials(form.username, form.password);
        var data = {
            username: UserService.getUsername(),
            key: UserService.getPassword()
        };

        API.fetch("/user/register", "POST", data)
        .success(function(response) {
            if (response.status == "success") {
                angular.element(".backstretch").remove();  // Remove login page background TODO: directive?
                UserService.isLoggedIn(true);
                $location.path("/goals");
            } else {
                if ("username" in response.data) {
                    if (response.data.username == "username taken") {
                        $scope.registerMessage = "Käyttäjänimi on varattu";
                    } else {
                        $scope.registerMessage = "Virheellinen käyttäjänimi";
                    }
                } else if ("key" in response.data) {
                    $scope.registerMessage = "Virheellinen salasana";
                } else {
                    $scope.registerMessage = "Rekisteröinti epäonnistui";
                }
                UserService.logout();
                $scope.loading = false;
            }
        })
        .error(function(data) {
            console.log("REGISTER ERROR=" + JSON.stringify(data));
            UserService.logout();
            $scope.registerMessage = "Rekisteröinti epäonnistui";
            $scope.loading = false;
            $scope.$apply();
        });
    };

    $scope.toggleDisclaimer = function(isVisible) {
        $scope.disclaimerIsVisible = isVisible;
    };

    $scope.establishServerConnection();
});
