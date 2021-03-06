/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
"use strict";
var advent = angular.module("Advent", ["ngRoute", "Courier"]);
advent.config(["$routeProvider", function ($routeProvider) {
        $routeProvider
            .when("/home", { caseInsensitiveMatch: true, templateUrl: "views/home.html", controller: "HomeController" })
            .otherwise({ redirectTo: "/home" });
    }]);
advent.controller("HomeController", ["$scope", function ($scope) {
        $scope.Blah = { Name: "One" };
        $scope.Test = function () {
            return $scope.Blah.Name === "pierre@whitespace.co.uk";
        };
    }]);
//# sourceMappingURL=advent.js.map