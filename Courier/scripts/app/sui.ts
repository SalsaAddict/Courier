/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
module Courier {
    "use strict";
    export function IsBlank(expression: any): boolean {
        if (expression === undefined) {
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
    export function IfBlank(expression: any, defaultValue: any): any {
        return (IsBlank(expression)) ? defaultValue : expression;
    }
    export function Option(value: any, defaultValue: string = "", allowedValues: string[] = []): string {
        var option: string = angular.lowercase(String(value)).trim();
        if (allowedValues.length > 0) {
            var found: boolean = false;
            angular.forEach(allowedValues, (allowedValue: string) => {
                if (angular.lowercase(allowedValue).trim() === option) { found = true; }
            });
            if (!found) { option = undefined; }
        }
        return IfBlank(option, angular.lowercase(defaultValue).trim());
    }
    export function Cast(value: any, format: string): any {
        if (IsBlank(value)) { return undefined; }
        var dateFormat: string = "YYYY-MM-DD";
        var formatted: any;
        switch (Option(format)) {
            case "date":
                switch (Option(value)) {
                    case "today": formatted = moment().format(dateFormat); break;
                    case "tomorrow": formatted = moment().add(1, "day").format(dateFormat); break;
                    case "yesterday": formatted = moment().subtract(1, "day").format(dateFormat); break;
                    default:
                        formatted = moment(value).format(dateFormat);
                        if (angular.lowercase(formatted).indexOf("invalid") >= 0) { formatted = null; }
                        break;
                }
                break;
            case "number": formatted = (angular.isNumber(value)) ? Number(value) : null; break;
            case "boolean": formatted = Boolean(value); break;
            case "xml": formatted = angular.toJson(value); break;
            default: formatted = String(value).trim(); break;
        }
        return formatted;
    }
    export module Main {
        "use strict";
        export interface IScope extends angular.IScope { }
        export class Controller {
            static $inject: string[] = ["$scope", "$log"];
            constructor(public $scope: IScope, public $log: angular.ILogService) { }
            private procedures: { [alias: string]: Function; } = {};
            addProcedure = (name: string, execute: Function): void => {
                this.procedures[name] = execute;
            };
            removeProcedure = (name: string): void => {
                if (angular.isDefined(this.procedures[name])) {
                    delete this.procedures[name];
                }
            };
            execute = (name: string): void => { this.procedures[name](); }
        }
    }
    export module Procedure {
        "use strict";
        export interface IScope extends angular.IScope {
            name: string; alias: string; model: string; type: string; root: string; run: string;
        }
        export class Controller {
            static $inject: string[] = ["$scope", "$parse", "$log", "$window"];
            constructor(
                public $scope: IScope,
                public $parse: angular.IParseService,
                public $log: angular.ILogService,
                public $window: angular.IWindowService) { }
            get name(): string { return this.$scope.name; }
            get alias(): string { return IfBlank(this.$scope.alias, this.$scope.name); }
            get model(): any {
                return (IsBlank(this.$scope.model)) ? undefined : this.$parse(this.$scope.model)(this.$scope.$parent);
            }
            set model(value: any) {
                if (!IsBlank(this.$scope.model)) {
                    this.$parse(this.$scope.model).assign(this.$scope.$parent, value);
                }
            }
            get type(): string {
                if (IsBlank(this.$scope.model)) {
                    return "execute";
                } else {
                    if (IsBlank(this.$scope.type)) {
                        return (IsBlank(this.$scope.root)) ? "array" : "object";
                    } else {
                        return Option(this.$scope.type, "array", ["singleton", "object"]);
                    }
                }
            }
            get root(): string { return (this.type === "object") ? IfBlank(this.$scope.root, undefined) : undefined; }
            get run(): string { return Option(this.$scope.run, "manual", ["auto", "once"]); }
            private parameters: Parameter.IFactory[] = [];
            addParameter = (parameterFactory: Parameter.IFactory): void => {
                this.parameters.push(parameterFactory);
            }
            removeParameter = (parameterFactory: Parameter.IFactory): void => {
                var i = this.parameters.indexOf(parameterFactory);
                if (i >= 0) { this.parameters.splice(i, 1); }
            }
            empty = (): void => { if (!IsBlank(this.$scope.model)) { this.model = (this.type === "array") ? [] : {}; } }
            execute = (): void => {
                this.empty();
                var procedure: { name: string; parameters: any[], type: string; token: string } = {
                    name: this.name, parameters: [], type: this.type, token: IfBlank(this.$window.localStorage.getItem("token"), null)
                };
                angular.forEach(this.parameters, (parameterFactory: Parameter.IFactory) => {
                    procedure.parameters.push(parameterFactory());
                });
                this.$log.debug("Execute:" + angular.toJson(procedure));
            }
            initialize = (): void => {
                this.$scope.$watch(() => { return this.parameters.length; }, (newValue: any, oldValue: any) => {
                    if (newValue !== oldValue) { if (this.run === "auto") { this.execute(); } }
                });
                this.$scope.$watch(() => { return this.run; }, (newValue: any, oldValue: any) => {
                    if (newValue !== oldValue) { if (this.run !== "manual") { this.execute(); } }
                });
                if (this.run !== "manual") { this.execute(); } else { this.empty(); }
            }
        }
    }
    export module Parameter {
        "use strict";
        export interface IScope extends angular.IScope {
            name: string; type: string; value: string; format: string; required: string;
        }
        export interface IParameter {
            name: string; value: any; xml: boolean; required: boolean;
        }
        export interface IFactory {
            (): IParameter;
        }
        export class Controller {
            static $inject: string[] = ["$scope", "$routeParams", "$parse"];
            constructor(
                public $scope: IScope,
                public $routeParams: angular.route.IRouteParamsService,
                public $parse: angular.IParseService) { }
            get name(): string { return this.$scope.name; }
            get type(): string {
                if (IsBlank(this.$scope.type)) {
                    return (IsBlank(this.$scope.value)) ? "route" : "value";
                } else {
                    return Option(this.$scope.type, "value", ["route", "scope"]);
                }
            }
            get value(): any {
                var value: any = undefined;
                switch (this.type) {
                    case "route": value = this.$routeParams[IfBlank(this.$scope.value, this.$scope.name)]; break;
                    case "scope": value = this.$parse(this.$scope.value)(this.$scope.$parent); break;
                    default: value = this.$scope.value; break;
                }
                return IfBlank(Cast(value, this.$scope.format), null);
            }
            get xml(): boolean { return (Option(this.$scope.format) === "xml"); }
            get required(): boolean { return (Option(this.$scope.required) === "true"); }
            factory = (): IParameter => {
                return { name: this.name, value: this.value, xml: this.xml, required: this.required };
            }
        }
    }
}

var courier = angular.module("Courier", []);

courier.directive("courier", function () {
    return {
        restrict: "E",
        scope: <Courier.Main.IScope> {},
        controller: Courier.Main.Controller,
        require: ["courier"],
        link: function (
            $scope: Courier.Procedure.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [Courier.Main.Controller]) { }
    };
});

courier.directive("couProcedure", function () {
    return {
        restrict: "E",
        scope: <Courier.Procedure.IScope> { name: "@", model: "@", type: "@", root: "@", run: "@" },
        controller: Courier.Procedure.Controller,
        require: ["couProcedure", "^courier"],
        link: function (
            $scope: Courier.Procedure.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [Courier.Procedure.Controller, Courier.Main.Controller]) {
            controllers[0].initialize();
            controllers[1].addProcedure(controllers[0].alias, controllers[0].execute);
            $scope.$on("$destroy", function () {
                controllers[0].model = undefined;
                controllers[1].removeProcedure(controllers[0].alias);
            });
        }
    };
});

courier.directive("couParameter", function () {
    return {
        restrict: "E",
        scope: <Courier.Parameter.IScope> { name: "@", type: "@", value: "@", format: "@", required: "@" },
        controller: Courier.Parameter.Controller,
        require: ["couParameter", "^couProcedure"],
        link: function (
            $scope: Courier.Procedure.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [Courier.Parameter.Controller, Courier.Procedure.Controller]) {
            controllers[1].addParameter(controllers[0].factory);
            $scope.$on("$destroy", () => { controllers[1].removeParameter(controllers[0].factory); });
            $scope.$watch(function () { return controllers[0].value; }, function (newValue: any, oldValue: any) {
                if (newValue !== oldValue) { if (controllers[1].run === "auto") { controllers[1].execute(); } }
            });
        }
    };
});