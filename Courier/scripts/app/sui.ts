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
        export interface IScope extends angular.IScope { execute: Function; }
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
            execute = this.$scope.execute = (name: string): void => { this.procedures[name](); }
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
                if (this.run !== "manual") { this.execute(); } else { this.empty(); }
                if (this.run === "auto") {
                    this.$scope.$watch(() => { return this.parameters.length; }, (newValue: any, oldValue: any) => {
                        if (newValue !== oldValue) { this.execute(); }
                    });
                }
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
    export module Form {
        export interface IScope extends angular.IScope {
            heading: string; subheading: string;
            form: angular.IFormController;
            back: string; save: string; delete: string;
        }
        export class Controller {
            static $inject: string[] = ["$scope", "$window", "$location", "$route"];
            constructor(
                public $scope: IScope,
                public $window: angular.IWindowService,
                public $location: angular.ILocationService,
                public $route: angular.route.IRouteService) { }
            get heading(): string { return IfBlank(this.$scope.heading, undefined); }
            get subheading(): string { return IfBlank(this.$scope.subheading, undefined); }
            back = () => {
                if (IsBlank(this.$scope.back)) {
                    this.$window.history.back();
                } else {
                    this.$location.path(this.$scope.back);
                }
            }
            undo = () => { this.$route.reload(); }
            get canEdit(): boolean { return !IsBlank(this.$scope.save); }
            get saveProcedure(): string { return IfBlank(this.$scope.save, undefined); }
            save: Function = undefined;
            get canDelete(): boolean { return !IsBlank(this.$scope.delete); }
            get deleteProcedure(): string { return IfBlank(this.$scope.delete, undefined); }
            delete: Function = undefined;
            get dirty(): boolean { return this.$scope.form.$dirty; }
        }
    }
    export module FormItem {
        export interface IScope extends angular.IScope {
            heading: string; form: angular.IFormController;
        }
        export class Controller {
            static $inject: string[] = ["$scope", "$log"];
            constructor(public $scope: IScope, public $log: angular.ILogService) { }
            get heading(): string { return IfBlank(this.$scope.heading, undefined); }
            private validators: Validator.IFactory[] = [];
            addValidator = (validatorFactory: Validator.IFactory) => {
                this.validators.push(validatorFactory);
            }
            removeValidator = (validatorFactory: Validator.IFactory) => {
                var i: number = this.validators.indexOf(validatorFactory);
                if (i >= 0) { this.validators.splice(i, 1); }
            }
            get hasError(): boolean {
                //if (this.$scope.form.$error) {
                //    return true;
                //} else {
                    var hasError: boolean = false;
                    angular.forEach(this.validators, (validatorFactory: Courier.Validator.IFactory) => {
                        if (!validatorFactory()) { hasError = true; }
                        this.$log.debug(hasError);
                    });
                    return hasError;
                //}
            }
        }
    }
    export module Validator {
        export interface IFactory { (): boolean; }
        export interface IScope extends angular.IScope { fn: IFactory; }
    }
}

var courier = angular.module("Courier", [
    "ngRoute",
    "ui.bootstrap",
    "templates/couForm.html",
    "templates/couFormItem.html"]);

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
            controllers: [Courier.Main.Controller]) {
        }
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
            $scope.$on("$destroy", () => {
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
            if (controllers[1].run === "auto") {
                $scope.$watch(() => { return controllers[0].value; }, (newValue: any, oldValue: any) => {
                    if (newValue !== oldValue) { controllers[1].execute(); }
                });
            }
        }
    };
});

courier.directive("couForm", function () {
    return {
        restrict: "E",
        templateUrl: "templates/couForm.html",
        transclude: true,
        scope: <Courier.Form.IScope> { heading: "@", subheading: "@", back: "@", save: "@", delete: "@" },
        controller: Courier.Form.Controller,
        controllerAs: "ctrl",
        require: ["couForm", "^courier"],
        link: function (
            $scope: Courier.Procedure.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controllers: [Courier.Form.Controller, Courier.Main.Controller]) {
            if (controllers[0].canEdit) {
                controllers[0].save = () => {
                    controllers[1].execute(controllers[0].saveProcedure);
                };
            }
            if (controllers[0].canDelete) {
                controllers[0].delete = () => {
                    controllers[1].execute(controllers[0].deleteProcedure);
                };
            }
        }
    };
});

courier.directive("couFormItem", function () {
    return {
        restrict: "E",
        templateUrl: "templates/couFormItem.html",
        transclude: true,
        scope: <Courier.FormItem.IScope> { heading: "@" },
        controller: Courier.FormItem.Controller,
        controllerAs: "ctrl"
    };
});

courier.directive("couValidator", function () {
    return {
        restrict: "E",
        scope: { fn: "&", message: "@"; },
        require: "^couFormItem",
        link: function (
            $scope: Courier.Validator.IScope,
            iElement: angular.IAugmentedJQuery,
            iAttrs: angular.IAttributes,
            controller: Courier.FormItem.Controller) {
            controller.addValidator($scope.fn);
            $scope.$on("$destroy", () => { controller.removeValidator($scope.fn); });
        }
    };
});

angular.module("templates/couForm.html", []).run(["$templateCache",
    function ($templateCache: angular.ITemplateCacheService) {
        $templateCache.put("templates/couForm.html",
            "<div class=\"panel panel-default form-horizontal\" ng-form=\"form\">" +
            "<div class=\"panel-heading\">" +
            "<h4><b>{{ctrl.heading}}</b>" +
            "<span ng-if=\"ctrl.subheading\"><br /><small>{{ctrl.subheading}}</small></span>" +
            "</h4>" +
            "</div>" + // panel-heading
            "<div class=\"panel-body\" ng-transclude></div>" +
            "<div class=\"panel-footer clearfix\">" +
            "<div class=\"pull-right\">" +
            "<div ng-if=\"form.$pristine\">" +
            "<div class=\"btn-group\">" +
            "<button ng-if=\"ctrl.canDelete\" type=\"button\" class=\"btn btn-danger\" ng-click=\"ctrl.delete()\">" +
            "<i class=\"fa fa-trash-o\"></i> Delete</button>" +
            "<button type=\"button\" class=\"btn btn-default\" ng-click=\"ctrl.back()\">" +
            "<i class=\"fa fa-chevron-circle-left\"></i> Back</button>" +
            "</div>" + // btn-group
            "</div>" + // $pristine
            "<div ng-if=\"form.$dirty\">" +
            "<div class=\"btn-group\">" +
            "<button type=\"reset\" class=\"btn btn-warning\" ng-click=\"ctrl.undo()\">" +
            "<i class=\"fa fa-undo\"></i> Undo</button>" +
            "<button type=\"submit\" class=\"btn btn-primary\" ng-click=\"ctrl.save()\">" +
            "<i class=\"fa fa-save\"></i> Save</button>" +
            "</div>" + // btn-group
            "</div>" + // $dirty
            "</div>" + // pull-right
            "</div>" + // panel-footer
            "</div>"); // panel
    }]);

angular.module("templates/couFormItem.html", []).run(["$templateCache",
    function ($templateCache: angular.ITemplateCacheService) {
        $templateCache.put("templates/couFormItem.html",
            "<div class=\"form-group\" ng-form=\"form\">" +
            "<label class=\"control-label col-sm-3\">{{ctrl.heading}} {{ctrl.hasError}}</label>" +
            "<div class=\"col-sm-9\" ng-transclude></div>" +
            "</div>"); // form-group
    }]);
