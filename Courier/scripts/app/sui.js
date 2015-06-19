/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
var SUI;
(function (SUI) {
    "use strict";
    function IsBlank(expression) {
        if (angular.isUndefined(expression)) {
            return true;
        }
        else if (expression === null) {
            return true;
        }
        else if (expression === {}) {
            return true;
        }
        else if (expression === []) {
            return true;
        }
        else if (String(expression).trim().length === 0) {
            return true;
        }
        else {
            return false;
        }
    }
    SUI.IsBlank = IsBlank;
    function IfBlank(expression, defaultValue) {
        if (defaultValue === void 0) { defaultValue = null; }
        return (IsBlank(expression)) ? defaultValue : expression;
    }
    SUI.IfBlank = IfBlank;
    function Option(expression, defaultValue) {
        if (defaultValue === void 0) { defaultValue = ""; }
        return angular.lowercase(IfBlank(expression, defaultValue)).trim();
    }
    SUI.Option = Option;
    var Main;
    (function (Main) {
        var Controller = (function () {
            function Controller($scope, $log) {
                var _this = this;
                this.$scope = $scope;
                this.$log = $log;
                this._procedures = {};
                this.addProcedure = function (alias, execute) {
                    _this._procedures[alias] = execute;
                };
                this.removeProcedure = function (alias) {
                    if (angular.isDefined(_this._procedures[alias])) {
                        delete _this._procedures[alias];
                    }
                };
                this.execute = function (alias) {
                    _this._procedures[alias]();
                };
            }
            Controller.$inject = ["$scope", "$log"];
            return Controller;
        })();
        Main.Controller = Controller;
    })(Main = SUI.Main || (SUI.Main = {}));
    var Procedure;
    (function (Procedure) {
        var Controller = (function () {
            function Controller($scope, $parse, $log) {
                var _this = this;
                this.$scope = $scope;
                this.$parse = $parse;
                this.$log = $log;
                this._parameters = [];
                this.emptyModel = function () {
                    _this.model.assign(_this.$scope.$parent, (_this.type === "array") ? [] : {});
                };
                this.execute = function () {
                    var hasRequired = true;
                    var parameters = [];
                    angular.forEach(_this._parameters, function (parameterFactory) {
                        var parameter = parameterFactory();
                        parameters.push({ name: parameter.name, value: parameter.value, xml: parameter.xml });
                        if (parameter.required) {
                            if (IsBlank(parameter.value)) {
                                hasRequired = false;
                            }
                        }
                    });
                    var procedure = { name: _this.name, parameters: parameters, type: _this.type };
                    _this.$log.debug(angular.toJson(procedure, false));
                };
                this.addParameter = function (parameterFactory) {
                    _this._parameters.push(parameterFactory);
                };
                this.removeParameter = function (parameterFactory) {
                    var i = _this._parameters.indexOf(parameterFactory);
                    if (i >= 0) {
                        _this._parameters.splice(i, 1);
                    }
                };
            }
            Object.defineProperty(Controller.prototype, "name", {
                get: function () { return this.$scope.name; },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "alias", {
                get: function () { return IfBlank(this.$scope.alias, this.name); },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "model", {
                get: function () {
                    return (IsBlank(this.$scope.model)) ? undefined : this.$parse(this.$scope.model);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "type", {
                get: function () {
                    if (IsBlank(this.$scope.model)) {
                        return undefined;
                    }
                    else if (IsBlank(this.$scope.type)) {
                        return (IsBlank(this.$scope.root)) ? "object" : "array";
                    }
                    else {
                        var type = Option(this.$scope.type);
                        return (["singleton", "object"].indexOf(type) >= 0) ? type : "array";
                    }
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "root", {
                get: function () {
                    return (this.type === "object") ? IfBlank(this.$scope.root, undefined) : undefined;
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "run", {
                get: function () {
                    var run = Option(this.$scope.run);
                    return (["auto", "once"].indexOf(run) >= 0) ? run : "manual";
                },
                enumerable: true,
                configurable: true
            });
            Controller.$inject = ["$scope", "$parse", "$log"];
            return Controller;
        })();
        Procedure.Controller = Controller;
    })(Procedure = SUI.Procedure || (SUI.Procedure = {}));
    var Parameter;
    (function (Parameter) {
        var Controller = (function () {
            function Controller($scope, $routeParams, $parse, $log) {
                var _this = this;
                this.$scope = $scope;
                this.$routeParams = $routeParams;
                this.$parse = $parse;
                this.$log = $log;
                this.factory = function () {
                    var type = Option(_this.$scope.type, (IsBlank(_this.$scope.value)) ? "route" : "value");
                    var format = Option(_this.$scope.format, "");
                    var value, xml = false;
                    switch (type) {
                        case "route":
                            value = _this.$routeParams[_this.$scope.value || _this.$scope.name];
                            break;
                        case "scope":
                            value = _this.$parse(_this.$scope.value)(_this.$scope.$parent);
                            break;
                        default:
                            value = _this.$scope.value;
                            break;
                    }
                    if (IsBlank(value)) {
                        value = null;
                    }
                    else {
                        switch (format) {
                            case "date":
                                switch (Option(value, "")) {
                                    case "today":
                                        value = moment().format("YYYY-MM-DD");
                                        break;
                                    case "tomorrow":
                                        value = moment().add(1, "days").format("YYYY-MM-DD");
                                        break;
                                    case "yesterday":
                                        value = moment().subtract(1, "days").format("YYYY-MM-DD");
                                        break;
                                    default:
                                        value = moment(value).format("YYYY-MM-DD");
                                        if (angular.lowercase(value).indexOf("invalid") >= 0) {
                                            value = null;
                                        }
                                        break;
                                }
                                break;
                            case "number":
                                value = Number(value);
                                break;
                            case "xml":
                                value = angular.toJson(value, false);
                                xml = true;
                                break;
                            default:
                                if (angular.isObject(value)) {
                                    value = angular.toJson(value, false);
                                    xml = true;
                                }
                                break;
                        }
                    }
                    return {
                        name: _this.$scope.name,
                        value: value,
                        xml: xml,
                        required: Option(_this.$scope.required, "false") === "true"
                    };
                };
            }
            Controller.$inject = ["$scope", "$routeParams", "$parse", "$log"];
            return Controller;
        })();
        Parameter.Controller = Controller;
    })(Parameter = SUI.Parameter || (SUI.Parameter = {}));
})(SUI || (SUI = {}));
var sui = angular.module("SUI", ["ngRoute",
    "templates/transclude.html"
]);
sui.directive("sui", function () {
    return {
        restrict: "E",
        templateUrl: "templates/transclude.html",
        transclude: true,
        replace: true,
        scope: {},
        controller: SUI.Main.Controller
    };
});
sui.directive("suiProc", function () {
    return {
        restrict: "E",
        templateUrl: "templates/transclude.html",
        transclude: true,
        replace: true,
        scope: { name: "@", alias: "@", model: "@", type: "@", root: "@", run: "@" },
        controller: SUI.Procedure.Controller,
        require: ["^^sui", "suiProc"],
        link: function ($scope, iElement, iAttrs, controllers) {
            controllers[0].addProcedure(controllers[1].alias, controllers[1].execute);
            $scope.$on("$destroy", function () { controllers[0].removeProcedure(controllers[1].alias); });
            if (controllers[1].run !== "manual") {
                controllers[1].execute();
            }
        }
    };
});
sui.directive("suiProcParam", function () {
    return {
        restrict: "E",
        templateUrl: "templates/transclude.html",
        transclude: true,
        replace: true,
        scope: { name: "@", type: "@", value: "@", format: "@", required: "@" },
        controller: SUI.Parameter.Controller,
        require: ["suiProcParam", "^^suiProc"],
        link: function ($scope, iElement, iAttrs, controllers) {
            controllers[1].addParameter(controllers[0].factory);
            $scope.$on("$destroy", function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    controllers[1].removeParameter(controllers[0].factory);
                }
            });
            $scope.$watch(function () { return controllers[0].factory().value; }, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (controllers[1].run === "auto") {
                        controllers[1].execute();
                    }
                }
            });
        }
    };
});
angular.module("templates/transclude.html", [])
    .run(["$templateCache", function ($templateCache) {
        $templateCache.put("templates/transclude.html", "<ng-transclude></ng-transclude>");
    }]);
//# sourceMappingURL=sui.js.map