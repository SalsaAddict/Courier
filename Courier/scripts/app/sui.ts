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
    export function IfBlank(expression: any, defaultValue: any = null) {
        return (IsBlank(expression)) ? defaultValue : expression;
    }
    export function Option(expression: string, defaultValue: string = ""): string {
        return angular.lowercase(IfBlank(expression, defaultValue)).trim();
    }
    export module Main {
        export interface IScope extends angular.IScope { }
        export class Controller {
            static $inject: string[] = ["$scope", "$log"];
            constructor(public $scope: IScope, public $log: angular.ILogService) { }
            private _procedures: { [alias: string]: Function; } = {};
            addProcedure = (alias: string, execute: Function) => {
                this._procedures[alias] = execute;
            }
            removeProcedure = (alias: string) => {
                if (angular.isDefined(this._procedures[alias])) {
                    delete this._procedures[alias];
                }
            }
            execute = (alias: string) => {
                this._procedures[alias]();
            }
        }
    }
    export module Procedure {
        export interface IScope extends angular.IScope {
            name: string;
            alias: string;
            model: string;
            type: string;
            root: string;
            run: string;
        }
        export class Controller {
            static $inject: string[] = ["$scope", "$parse", "$log"];
            constructor(
                public $scope: IScope,
                public $parse: angular.IParseService,
                public $log: angular.ILogService) { }
            private _parameters: Parameter.IFactory[] = [];
            get name(): string { return this.$scope.name; }
            get alias(): string { return IfBlank(this.$scope.alias, this.name); }
            get model(): angular.ICompiledExpression {
                return (IsBlank(this.$scope.model)) ? undefined : this.$parse(this.$scope.model);
            }
            get type(): string {
                if (IsBlank(this.$scope.model)) {
                    return undefined;
                } else if (IsBlank(this.$scope.type)) {
                    return (IsBlank(this.$scope.root)) ? "object" : "array";
                } else {
                    var type: string = Option(this.$scope.type);
                    return (["singleton", "object"].indexOf(type) >= 0) ? type : "array";
                }
            }
            get root(): string {
                return (this.type === "object") ? IfBlank(this.$scope.root, undefined) : undefined;
            }
            get run(): string {
                var run: string = Option(this.$scope.run);
                return (["auto", "once"].indexOf(run) >= 0) ? run : "manual";
            }
            emptyModel = () => {
                this.model.assign(this.$scope.$parent, (this.type === "array") ? [] : {});
            }
            execute = () => {
                var hasRequired: boolean = true;
                var parameters: { name: string; value: any; xml: boolean; }[] = [];
                angular.forEach(this._parameters, (parameterFactory: Parameter.IFactory) => {
                    var parameter: Parameter.IParameter = parameterFactory();
                    parameters.push({ name: parameter.name, value: parameter.value, xml: parameter.xml });
                    if (parameter.required) { if (IsBlank(parameter.value)) { hasRequired = false; } }
                });
                var procedure: any = { name: this.name, parameters: parameters, type: this.type };
                this.$log.debug(angular.toJson(procedure, false));
            }
            addParameter = (parameterFactory: Parameter.IFactory) => {
                this._parameters.push(parameterFactory);
            }
            removeParameter = (parameterFactory: Parameter.IFactory) => {
                var i: number = this._parameters.indexOf(parameterFactory);
                if (i >= 0) { this._parameters.splice(i, 1); }
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
            static $inject: string[] = ["$scope", "$routeParams", "$parse", "$log"];
            constructor(
                public $scope: IScope,
                public $routeParams: angular.route.IRouteParamsService,
                public $parse: angular.IParseService,
                public $log: angular.ILogService) { }
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

sui.directive("sui", function () {
    return {
        restrict: "E",
        template: "<ng-transclude></ng-transclude>",
        transclude: true,
        scope: <SUI.Main.IScope> {},
        controller: SUI.Main.Controller
    };
});

sui.directive("suiProc", function () {
    return {
        restrict: "E",
        template: "<ng-transclude></ng-transclude>",
        transclude: true,
        scope: <SUI.Procedure.IScope> { name: "@", alias: "@", model: "@", type: "@", root: "@", run: "@" },
        controller: SUI.Procedure.Controller,
        require: ["^^sui", "suiProc"],
        link: function (
            $scope: SUI.Parameter.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [SUI.Main.Controller, SUI.Procedure.Controller]) {
            controllers[0].addProcedure(controllers[1].alias, controllers[1].execute);
            $scope.$on("$destroy", () => { controllers[0].removeProcedure(controllers[1].alias); });
            if (controllers[1].run !== "manual") { controllers[1].execute(); }
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
            $scope.$watch(() => { return controllers[0].factory().value; }, () => {
                if (controllers[1].run === "auto") { controllers[1].execute(); }
            });
        }

    };
});

