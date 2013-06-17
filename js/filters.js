"use strict";

/* Filters */

angular.module("app.filters", []).

// "asd" --> "Asd"
filter("title", function() {
    return function(text) {
        if (!text) {
            return text;
        }
        return text[0].toUpperCase() + text.substr(1);
    };
});
