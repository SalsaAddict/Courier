/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
"use strict";

var advent = angular.module("Advent", ["ngRoute", "SUI"]);

advent.config(["$routeProvider", function ($routeProvider: angular.route.IRouteProvider) {
    $routeProvider
        .when("/home", { caseInsensitiveMatch: true, templateUrl: "views/home.html" })
        .otherwise({ redirectTo: "/home" });
}]); 