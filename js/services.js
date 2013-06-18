/* global CryptoJS  */
"use strict";

/* Services */


angular.module("app.services", [])

// Käyttäjän tiedot TODO salasanan salaus
.factory("UserService", function(HashService) {
    var username,
    password,
    loggedIn = false,
    passwordSalt = "djn12gsiugaieufe4f8fafh";


    function getUsername() { return username; }
    function getPassword() { return password; }

    function isLoggedIn(status) {
        if (status !== undefined) {
            loggedIn = status;
        }
        return loggedIn;
    }

    function setCredentials(newUsername, newPassword) {
        username = newUsername;
        password = HashService.sha1(newPassword + passwordSalt);
    }

    function logout() {
        username = null;
        password = null;
        loggedIn = false;
    }

    return {
        getUsername: getUsername,
        getPassword: getPassword,
        isLoggedIn: isLoggedIn,
        setCredentials: setCredentials,
        logout: logout
    };
})

// SHA1 ja HMAC-SHA1-salausfunktiot
.factory("HashService", function() {
    var replacements = "aooAOO";

    function replaceUmlauts(base) {
        return base.replace(/[äöåÄÖÅ]/g, function(c) {
            return replacements.charAt("äöåÄÖÅ".indexOf(c));
        });
    }

    function sha1(base) {
        base = replaceUmlauts(base);
        return CryptoJS.SHA1(base).toString(CryptoJS.enc.Hex);
    }

    function hmac(key, base) {
        base = replaceUmlauts(base);
        return btoa(CryptoJS.HmacSHA1(base, key).toString(CryptoJS.enc.Hex));
    }

    return {
        sha1: sha1,
        hmac: hmac
    };
})

/* Autentikoidut HTTP-pyynnöt. */
.factory("API", function (HashService, UserService, $http) {
    var appName = "sovelluksen nimi",
        appKey = "sovelluksen avain",  // TODO turha
        urlRoot = "http://toimiiks.cloudapp.net/api/json",
        escape = encodeURIComponent;

        function fetch(url, method, data) {
            method = method || "GET";
            data = data || {};

        // Luodaan HTTP-pyyntö, palautetaan asynkroninen "lupaus":
        var options = {
            method: method.toUpperCase(),
            url: urlRoot + url
        };

        if (["GET", "DELETE"].indexOf(options.method) > -1) {
            options.params = data;
        } else {
            options.data = data;
        }


        return $http(options).then(
            function(response){
                return response.data;
            });
    }

    function fetchSigned(url, method, data) {
        method = method || "GET";
        data = data || {};

        // Kerätään parametrit allekirjoitusta varten:
        url = urlRoot + url;
        method = method.toUpperCase();
        var params = {
            "username": UserService.getUsername(),
            "client": appName,
            "timestamp": new Date().getTime().toString().substr(0, 10)
        };

        // Nämä parametrit eivät tule Authorization-headeriin,
        // niitä käytetään vain allekirjoituksessa:
        var signatureParams = {};
        for (var a in params) {
            signatureParams[a] = params[a];
        }
        for (var b in data) {
            signatureParams[b] = data[b];
        }

        // Kääritään parametrit yhteen merkkijonoon allekirjoitusta varten:
        var keys = Object.keys(signatureParams).sort(),
        paramPairs = [];
        for (var i in keys) {
            paramPairs.push(escape(keys[i]) + "=" + escape(signatureParams[keys[i]]));
        }
        var paramsStr = paramPairs.join("&");

        // Lisätään HTTP-metodi ja URL merkkijonoon:
        var baseStr = [escape(method), escape(url), escape(paramsStr)].join("&");

        // Luodaan allekirjoitus:
        var signingKey = appKey + "&" + UserService.getPassword();
        params["signature"] = HashService.hmac(signingKey, baseStr);

        // Luodaan Authorization-header:
        var authParams = [];
        for (var key in params) {
            authParams.push(escape(key) + '="' + escape(params[key]) + '"');
        }
        var authHeader = authParams.join(",");

        // Luodaan HTTP-pyyntö, palautetaan asynkroninen "lupaus":
        var options = {
            method: method,
            url: url,
            headers: { "Authorization": authHeader }
        };

        if (["GET", "DELETE"].indexOf(method) > -1) {
            options.params = data;
        } else {
            options.data = $.param(data);
        }

        return $http(options).then(
            function(response){
                return response.data;
            });
    }

    return {
        fetchSigned: fetchSigned,
        fetch: fetch
    };
});
