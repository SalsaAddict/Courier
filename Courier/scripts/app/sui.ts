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
    export function Option(value: any, defaultValue: string = ""): string {
        return String(IfBlank(value, IfBlank(defaultValue, ""))).trim().toLowerCase();
    }
    export function Format(value: any, format: string): any {
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
                        if (String(formatted).toLowerCase().indexOf("invalid") >= 0) { formatted = null; }
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
        }
    }
    export module Procedure {
        "use strict";
        export interface IScope extends angular.IScope {
            name: string; alias: string; model: string; type: string; root: string; run: string;
        }
        export class Controller {
            static $inject: string[] = ["$scope", "$parse", "$log"];
            constructor(
                public $scope: IScope,
                public $parse: angular.IParseService,
                public $log: angular.ILogService) { }
            get name(): string { return this.$scope.name; }
            get alias(): string { return IfBlank(this.$scope.alias, this.$scope.name); }
            get model(): any { return (IsBlank(this.$scope.model)) ? undefined : this.$parse(this.$scope.model)(this.$scope.$parent); }
            set model(value: any) { this.$parse(this.$scope.model).assign(this.$scope.$parent, value); }
            get type(): string {
                if (angular.isDefined(this.model)) {
                    if (IsBlank(this.$scope.type)) {
                        return (IsBlank(this.$scope.root)) ? "array" : "object";
                    } else {
                        var option = Option(this.$scope.type);
                        return (["singleton", "object"].indexOf(option) >= 0) ? option : "array";
                    }
                } else { return "execute"; }
            }
            get root(): string { return (this.type === "object") ? IfBlank(this.$scope.root, undefined) : undefined; }
            get run(): string {
                var option = Option(this.$scope.run);
                return (["auto", "once"].indexOf(option) >= 0) ? option : "manual";
            }
            private parameters: Parameter.IFactory[] = [];
            addParameter = (parameterFactory: Parameter.IFactory): void => {
                this.parameters.push(parameterFactory);
            }
            removeParameter = (parameterFactory: Parameter.IFactory): void => {
                var i = this.parameters.indexOf(parameterFactory);
                if (i >= 0) { this.parameters.splice(i, 1); }
            }
            execute = (): void => {
                var procedure: { name: string; parameters: any[], type: string; } = {
                    name: this.name,
                    parameters: [],
                    type: this.type
                };
                angular.forEach(this.parameters, (parameterFactory: Parameter.IFactory) => {
                    procedure.parameters.push(parameterFactory());
                });
                this.$log.debug(angular.toJson(procedure));
            }
            initialize = (): void => {
                var run = (): void => { if (this.run !== "manual") { this.execute(); } };
                this.$scope.$watch(() => { return this.parameters.length; }, (newValue: any, oldValue: any) => {
                    if (newValue !== oldValue) { if (this.run !== "manual") { run(); } }
                });
                this.$scope.$watch(() => { return this.run; }, (newValue: any, oldValue: any) => {
                    if (newValue !== oldValue) { if (this.run !== "manual") { run(); } }
                });
                run();
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
                    var option = Option(this.$scope.type);
                    return (["route", "scope"].indexOf(option) >= 0) ? option : "value";
                }
            }
            get value(): any {
                var value: any = undefined;
                switch (this.type) {
                    case "route": value = this.$routeParams[IfBlank(this.$scope.value, this.$scope.name)]; break;
                    case "scope": value = this.$parse(this.$scope.value)(this.$scope.$parent); break;
                    default: value = this.$scope.value; break;
                }
                return IfBlank(Format(value, this.$scope.format), null);
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

courier.directive("sui", function () {
    return {
        restrict: "E",
        scope: <Courier.Main.IScope> {},
        controller: Courier.Main.Controller,
        require: ["sui"],
        link: function (
            $scope: Courier.Procedure.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [Courier.Main.Controller]) { }
    };
});

courier.directive("suiProc", function () {
    return {
        restrict: "E",
        scope: <Courier.Procedure.IScope> { name: "@", model: "@", type: "@", root: "@", run: "@" },
        controller: Courier.Procedure.Controller,
        require: ["suiProc", "?^sui"],
        link: function (
            $scope: Courier.Procedure.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [Courier.Procedure.Controller, Courier.Main.Controller]) {
            controllers[0].initialize();
            if (controllers[1] !== null) {
                controllers[1].addProcedure(controllers[0].alias, controllers[0].execute);
                $scope.$on("$destroy", function () { controllers[1].removeProcedure(controllers[0].alias); });
            }
        }
    };
});

courier.directive("suiProcParam", function () {
    return {
        restrict: "E",
        scope: <Courier.Parameter.IScope> { name: "@", type: "@", value: "@", format: "@", required: "@" },
        controller: Courier.Parameter.Controller,
        require: ["suiProcParam", "^suiProc"],
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