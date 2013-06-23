 /* global d3, $, alert */
 "use strict";

 angular.module("app.controllers", [])

// Login
.controller("LoginCtrl", function ($scope, $http, $location, API, UserService) {
    $scope.loginTabSelected = true;

    $scope.login = function (username, password) {
        $scope.loading = true;
        UserService.setCredentials(username, password);
        API.fetchSigned("/user/favs")
        .success(function(response) {
            if (response.status == "success") {
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
})

// Index - list bites
.controller("IndexCtrl", function($scope, $location, API, UserService) {
    // Initial sort order for bites
    $scope.order = "date";
    $scope.reverse = true;

    // Date object --> "yyyyMMdd"
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
            console.log("slider undefined");
            return;
        }
        $scope.bitesLoading = true;
        var params = {
            start: formatDate($scope.slider.min),
            end: formatDate($scope.slider.max)
        };

        API.fetchSigned("/user/bites", "GET", params)
        .success(function(response) {
            if (response.status == "success") {
                $scope.bites = response.data;
                $scope.bitesOrder = "date"; // Reset table order
                $scope.datesOrder = "date";
                processBitesData();
                updateChart();
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

    function processBitesData() {  // TODO remove redundant processing
        if (!$scope.bites) {
            $scope.bitesByDate = null;
        }

        // Group bites by date
        var bites = $scope.bites,
        bite,
        biteAdded,
        data = [],
        attrs = ["kcal", "protein", "fat", "carbs"];  // TODO into global variable?

        for (var i in bites) {
            bite = bites[i];

            // If array already has an item with the same date, extend the item...
            biteAdded = false;
            for (var j in data) {
                if (data[j].date == bite.date) {
                    data[j].bites.push(bite);
                    for (var attrIndex in attrs) {
                        data[j][attrs[attrIndex]] += bite[[attrs[attrIndex]]];
                    }
                    biteAdded = true;
                }
            }

            // ...otherwise push a new item
            if (!biteAdded) {
                data.push({
                    date: bite.date,
                    bites: [bite],
                    kcal: bite.kcal,
                    protein: bite.protein,
                    fat: bite.fat,
                    carbs: bite.fat
                });
            }
        }

        $scope.bitesByDate = data;
        $scope.selectedItem = data[0];
    }

    $scope.removeBite = function(bite) {
        bite.loading = true;
        var biteId = bite["_id"];
        API.fetchSigned("/user/bites/" + biteId, "DELETE")
        .success(function(response) {
            if (response.status == "success") {
                $scope.bites.splice($scope.bites.indexOf(bite), 1);
                processBitesData();
                updateChart();
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

    // "yyyyMMdd" --> Date object
    function parseDate(dt) {
        return new Date(dt.substr(0, 4), dt.substr(4, 2) - 1, dt.substr(6, 2));
    }

    function updateChart() {
        var data = {protein: [], carbs: [], fat: [], kcal: []},
        bite,
        foundMatch,
        maxValue = 0;

        // Process data
        for (var i in $scope.bites) {
            bite = $scope.bites[i];
            foundMatch = false;

            for (var j in data.protein) {
                if (data.protein[j].date == bite.date) {
                    data.protein[j].value += bite.protein;
                    data.carbs[j].value += bite.carbs;
                    data.fat[j].value += bite.fat;
                    data.kcal[j].value += bite.kcal;

                    foundMatch = true;
                    break;
                }
            }

            if (!foundMatch) {
                data.protein.push({date: bite.date, value: bite.protein});
                data.fat.push({date: bite.date, value: bite.fat});
                data.carbs.push({date: bite.date, value: bite.carbs});
                data.kcal.push({date: bite.date, value: bite.kcal});
            }
        }

        var chartData = {
            entries: data,
            minDate: new Date($scope.slider.min),
            maxDate: new Date($scope.slider.max)
        };
        $scope.chartData = chartData;
    }

    // Load initial bites
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

            API.fetch("/foods?q=" + query)
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
        // Parse date into API's format (yyyyMMdd)  // TODO global function?
        var dateParts = $scope.bite.date.split("."),
        day = dateParts[0].length == 1 ? "0" + dateParts[0] : dateParts[0],
        month = dateParts[1].length == 1 ? "0" + dateParts[1] : dateParts[1],
        year = dateParts[2].length == 2 ? "20" + dateParts[2] : dateParts[2],

        data = {
            fid: $scope.food["_id"],
            amount: $scope.bite.amount,
            date: year + month + day
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
