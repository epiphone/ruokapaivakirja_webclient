 /* global d3, $, alert */
 "use strict";

 angular.module("app.controllers", [])

// Navbar - used to hide nav buttons if the user isn't logged in
.controller("NavCtrl", function ($scope, $location, UserService) {
    $scope.loggedIn = function() { return UserService.isLoggedIn(); };

    $scope.navClass = function(link) {
        var path = $location.path();
        return link == path ? "disabled" : "";
    };
})

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

    $scope.login = function (username, password) {
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

    $scope.register = function (form) {
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
})

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
        $scope.distribution = {min: 30, max: 85};
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
})

// Index - list bites
.controller("IndexCtrl", function($scope, $location, $timeout, API, UserService) {
    // Initial sort order for bites
    $scope.order = "date";
    $scope.reverse = true;
    $scope.goals = UserService.getGoals();

    /** Date object -> "yyyyMMdd" */
    function formatDate(d) {
        var monthStr = (d.getMonth() + 1).toString(),
        month = monthStr.length == 1 ? "0" + monthStr : monthStr,
        day = d.getDate().toString().length == 1 ? "0" + d.getDate() : d.getDate();

        return d.getFullYear() + month + day;
    }

    // Set slider handles' initial positions
    var today = new Date();
    $scope.slider = {
        min: new Date(today.getFullYear(), today.getMonth(), today.getDate() -15),
        max: new Date(today.getFullYear(), today.getMonth(), today.getDate())
    };

    $scope.getBites = function() {
        if (!$scope.slider) {
            return;
        }

        $scope.bitesLoading = true;
        var params = {
            start: formatDate($scope.slider.min),
            end: formatDate($scope.slider.max)
        };

        API.fetchSigned("/user/days", "GET", params)
        .success(function(response) {
            if (response.status == "success") {
                var date, dates = response.data;
                dates.forEach(function(d) {
                    date = new Date(d.date);
                    date.setHours(0);
                    d.date = date;
                });

                $scope.dates = dates.sort(function(a,b){
                    return a.date - b.date;
                });

                $scope.datesOrder = "date";
                $scope.datesReverse = true;
                processChartData();
            } else {
                console.log("BITES ERROR=" + JSON.stringify(response));
            }
            $scope.bitesLoading = false;
        })
        .error(function(response) {
            console.log("BITES ERROR=" + JSON.stringify(response));
            $scope.bitesLoading = false;
        });
    };

    $scope.removeBite = function(bite) {
        bite.loading = true;
        var biteId = bite["_id"];
        API.fetchSigned("/user/bites/" + biteId, "DELETE")
        .success(function(response) {
            if (response.status == "success") {
                $scope.bites.splice($scope.bites.indexOf(bite), 1);
                processChartData();
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

    /**
     * Initialize scope variables lineChartData and barChartData, which are
     * bound to the charts.
     */
     function processChartData() {
        var lineData = {protein: [], carbs: [], fat: [], kcal: []};
        var barData = [];
        var dateObj;
        var attr;

        var dates = $scope.dates;
        var goals = $scope.goals;

        for (var i in dates) {
            dateObj = $scope.dates[i];

            for (var j in Object.keys(lineData)) {
                attr = Object.keys(lineData)[j];
                lineData[attr].push({
                    date: dateObj.date,
                    value: dateObj[attr]});
            }

            barData.push({
                date: dateObj.date,
                amounts: [
                { name: "kcal", value: Math.floor(100 * dateObj.kcal / goals.kcal)},
                { name: "carbs", value: Math.floor(100 * dateObj.carbs / goals.carbs)},
                { name: "fat", value: Math.floor(100 * dateObj.fat / goals.fat)},
                { name: "protein", value: Math.floor(100 * dateObj.protein / goals.protein)}
                ]
            });
        }
        $scope.lineChartData = {
            entries: lineData,
            minDate: new Date($scope.slider.min),
            maxDate: new Date($scope.slider.max)
        };

        $scope.barChartData = {
            entries: barData,
            minDate: new Date($scope.slider.min),
            maxDate: new Date($scope.slider.max)
        };

        blockChartButtons();
    }

    /**
     * Blocks the buttons that hightlight chart lines or bars for a second,
     * so that a transition doesn't get interrupted by the user.
     */
    function blockChartButtons() {
        $scope.chartLoading = true;
        $timeout(function() { $scope.chartLoading = false; }, 1000);
    }

    $scope.toggleChart = function() {
        blockChartButtons();
        $scope.chartToShow = $scope.chartToShow == "linechart" ? "barchart" : "linechart";
    };

    // Load initial bites
    $scope.chartToShow = "linechart";
    $scope.getBites();
})


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

    $scope.getFavourites();
});
