/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
"use strict";

var advent = angular.module("Advent", ["ngRoute", "Courier"]);

advent.config(["$routeProvider", function ($routeProvider: angular.route.IRouteProvider) {
    $routeProvider
        .when("/home", { caseInsensitiveMatch: true, templateUrl: "views/home.html", controller: "HomeController" })
        .otherwise({ redirectTo: "/home" });
}]);

advent.controller("HomeController", ["$scope", function ($scope: any) {
    $scope.Test = function () {
        return false;
    };
}]);