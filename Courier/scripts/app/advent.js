/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
"use strict";
var advent = angular.module("Advent", ["ngRoute", "sui"]);
advent.config(["$routeProvider", function ($routeProvider) {
        $routeProvider
            .when("/home", { caseInsensitiveMatch: true, templateUrl: "views/home.html" })
            .otherwise({ redirectTo: "/home" });
    }]);
//# sourceMappingURL=advent.js.map