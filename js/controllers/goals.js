"use strict";

angular.module("app.controllers")

// Goals - user is redirected here after registration to set daily calorie goals etc.
.controller("GoalsCtrl", function($scope, $location, API, UserService) {
    $scope.existingGoals = UserService.getGoals();
    $scope.newUser = !$scope.existingGoals;

    $scope.activityLevels = [
    "Ei ollenkaan",
    "Vähän",
    "Kohtalaisesti",
    "Paljon",
    "Todella paljon"
    ];

    $scope.activityDescriptions = [
    "Istumatyö, vähän liikuntaa",
    "Kevyttä liikuntaa 1-3 tuntia viikossa",
    "Kohtalaisen raskasta liikuntaa 3-5 tuntia viikossa",
    "Raskasta liikuntaa 6-7 tuntia viikossa",
    "Raskasta liikuntaa >7 tuntia viikossa"
    ];

    $scope.isFemale = false;

    $scope.cancelUpdate = function() {
        $location.path("/");
    };

    $scope.calculateBMR = function(age, height, weight, activityLevel, isFemale) {
        var base;
        var activityMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9];
        if (isFemale) {
            base = 447.593 + 9.247 * weight + 3.098 * height - 4.330 * age;
        } else {
            base = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
        }
        $scope.bmr = base * activityMultipliers[activityLevel];
        return $scope.bmr;
    };

    $scope.resetDistribution = function() {
        $scope.distribution = {min: 55, max: 85};
    };

    $scope.setGoals = function() {
        $scope.loadingGoals = true;

        var min = $scope.distribution.min;
        var max = $scope.distribution.max;
        var bmr = $scope.bmr;

        if (_.some([min, max, bmr], function(e) { return !e || isNaN(e) || e < 1; })) {
            $scope.errorMessage = "Virheellinen syöte";
            $scope.loadingGoals = false;
            return;
        }

        var payload = {
            kcal: Math.floor(bmr),
            carbs: Math.floor(min / 100 * bmr / 4),
            fat: Math.floor((max - min) / 100 * bmr / 9),
            protein: Math.floor((100 - max) / 100 * bmr / 4)
        };

        API.fetchSigned("/user/goals", "POST", payload)
        .success(function(response) {
            if (response.status == "success") {
                // Set goals, redirect to index page:
                UserService.setGoals(payload);
                $location.path("/");
            } else {
                console.log("SET GOALS ERROR=" + JSON.stringify(response));
            }
            $scope.loadingGoals = false;
        })
        .error(function(response) {
            console.log("SET GOALS ERROR=" + JSON.stringify(response));
            $scope.loadingGoals = false;
        });
    };

    $scope.resetDistribution();
});