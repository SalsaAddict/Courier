/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
"use strict";
module SUI {
    "use strict";
    export function IsBlank(expression: any): boolean {
        if (angular.isUndefined(expression)) {
            return true;
        } else if (expression === null) {
            return true;
        } else if (expression === {}) {
            return true;
        } else if (expression === []) {
            return true;
        } else if (String(expression).trim().length === 0) {
            return true;
        } else {
            return false;
        }
    }
    export function IfBlank(expression: any, defaultValue: any) {
        return (IsBlank(expression)) ? defaultValue : expression;
    }
    export function Option(expression: string, defaultValue: string): string {
        return angular.lowercase(IfBlank(expression, defaultValue)).trim();
    }
    export module Main {
        export interface IScope extends angular.IScope { }
        export class Controller {
            static $inject: string[] = ["$scope", "$log"];
            constructor(public $scope: IScope, public $log: angular.ILogService) { }
            private _procedures: { [alias: string]: Procedure.IFactory; } = {};
            addProcedure = (alias: string, procedureFactory: Procedure.IFactory) => {
                this._procedures[alias] = procedureFactory;
            }
            removeProcedure = (alias: string) => {
                if (angular.isDefined(this._procedures[alias])) {
                    delete this._procedures[alias];
                }
            }
            execute = (alias: string) => {
                this._procedures[alias]().execute();
            }
        }
    }
    export module Procedure {
        export interface IProcedure {
            name: string;
            parameters: Parameter.IParameter[];
            type: string;
        }
        export interface IFactory {
            (): IProcedure;
        }
        export interface IScope extends angular.IScope {
            name: string;
            type: string;
            run: string;
            factory: IFactory;
        }
        export class Controller {
            static $inject: string[] = ["$scope", "$log"];
            constructor(public $scope: IScope, public $log: angular.ILogService) { }
            private _parameters: Parameter.IFactory[] = [];
            addParameter = (parameterFactory: Parameter.IFactory) => {
                this._parameters.push(parameterFactory);
            }
            removeParameter = (parameterFactory: Parameter.IFactory) => {
                var i: number = this._parameters.indexOf(parameterFactory);
                if (i >= 0) { this._parameters.splice(i, 1); }
            }
            factory = this.$scope.factory = () => {
                var procedure: IProcedure = {
                    name: this.$scope.name,
                    parameters: [],
                    type: Option(this.$scope.run, "manual")
                };
                if (["manual", "auto", "once"].indexOf(procedure.type) < 0) { procedure.type = "manual"; }
                angular.forEach(this._parameters, (parameterFactory: Parameter.IFactory) => {
                    procedure.parameters.push(parameterFactory());
                });
                return procedure;
            }
            execute = () => {
                this.$log.debug(angular.toJson(this.$scope.factory()));
            }
            autoexec = () => {
            }
        }
    }
    export module Parameter {
        export interface IParameter {
            name: string;
            value: any;
            xml: boolean;
            required: boolean;
        }
        export interface IFactory {
            (): IParameter;
        }
        export interface IScope extends angular.IScope {
            name: string;
            type: string;
            value: string;
            format: string;
            required: string;
        }
        export class Controller {
            static $inject: string[] = ["$scope", "$routeParams", "$parse"];
            constructor(
                public $scope: IScope,
                public $routeParams: angular.route.IRouteParamsService,
                public $parse: angular.IParseService) { }
            factory = () => {
                var type = Option(this.$scope.type, (IsBlank(this.$scope.value)) ? "route" : "value");
                var format = Option(this.$scope.format, "");
                var value: any, xml: boolean = false;
                switch (type) {
                    case "route":
                        value = this.$routeParams[this.$scope.value || this.$scope.name];
                        break;
                    case "scope":
                        value = this.$parse(this.$scope.value)(this.$scope.$parent);
                        break;
                    default:
                        value = this.$scope.value;
                        break;
                }
                if (IsBlank(value)) {
                    value = null;
                } else {
                    switch (format) {
                        case "date":
                            switch (Option(value, "")) {
                                case "today": value = moment().format("YYYY-MM-DD"); break;
                                case "tomorrow": value = moment().add(1, "days").format("YYYY-MM-DD"); break;
                                case "yesterday": value = moment().subtract(1, "days").format("YYYY-MM-DD"); break;
                                default:
                                    value = moment(value).format("YYYY-MM-DD");
                                    if (angular.lowercase(value).indexOf("invalid") >= 0) { value = null; };
                                    break;
                            }
                            break;
                        case "number": value = Number(value); break;
                        case "xml": value = angular.toJson(value, false); xml = true; break;
                        default: if (angular.isObject(value)) { value = angular.toJson(value, false); xml = true; }
                    }
                }
                return {
                    name: this.$scope.name,
                    value: value,
                    xml: xml,
                    required: Option(this.$scope.required, "false") === "true"
                };
            }
        }
    }
}

var sui = angular.module("SUI", ["ngRoute"]);

sui.directive("suiProc", function () {
    return {
        restrict: "E",
        template: "{{factory()}}<ng-transclude></ng-transclude>",
        transclude: true,
        scope: <SUI.Procedure.IScope> { name: "@", type: "@", run: "@" },
        controller: SUI.Procedure.Controller,
        require: ["suiProc"],
        link: function (
            $scope: SUI.Parameter.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [SUI.Procedure.Controller]) {
            controllers[0].execute();
        }
    };
});

sui.directive("suiProcParam", function () {
    return {
        restrict: "E",
        scope: <SUI.Parameter.IScope> { name: "@", type: "@", value: "@", format: "@", required: "@" },
        controller: SUI.Parameter.Controller,
        require: ["suiProcParam", "^^suiProc"],
        link: function (
            $scope: SUI.Parameter.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [SUI.Parameter.Controller, SUI.Procedure.Controller]) {
            controllers[1].addParameter(controllers[0].factory);
            $scope.$on("$destroy", (newValue: any, oldValue: any) => {
                if (newValue !== oldValue) { controllers[1].removeParameter(controllers[0].factory); }
            });
        }

    };
});

