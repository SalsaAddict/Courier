/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
"use strict";
var SUI;
(function (SUI) {
    "use strict";
    function IsBlank(expression) {
        if (expression === undefined) {
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
        return (IsBlank(expression)) ? defaultValue : expression;
    }
    SUI.IfBlank = IfBlank;
    function Option(value, defaultValue) {
        if (defaultValue === void 0) { defaultValue = ""; }
        return String(IfBlank(value, IfBlank(defaultValue, ""))).trim().toLowerCase();
    }
    SUI.Option = Option;
    function Format(value, format) {
        var dateFormat = "YYYY-MM-DD";
        var formatted;
        switch (Option(format)) {
            case "date":
                switch (Option(value)) {
                    case "today":
                        formatted = moment().format(dateFormat);
                        break;
                    case "tomorrow":
                        formatted = moment().add(1, "day").format(dateFormat);
                        break;
                    case "yesterday":
                        formatted = moment().subtract(1, "day").format(dateFormat);
                        break;
                    default:
                        formatted = moment(value).format(dateFormat);
                        if (String(formatted).toLowerCase().indexOf("invalid") >= 0) {
                            formatted = null;
                        }
                        break;
                }
                break;
            case "number":
                formatted = (angular.isNumber(value)) ? Number(value) : null;
                break;
            case "boolean":
                formatted = Boolean(value);
                break;
            case "xml":
                formatted = angular.toJson(value);
                break;
            default:
                formatted = String(value).trim();
                break;
        }
        return formatted;
    }
    SUI.Format = Format;
    var Main;
    (function (Main) {
        "use strict";
        var Controller = (function () {
            function Controller($scope) {
                var _this = this;
                this.$scope = $scope;
                this.addProcedure = function (name, execute) {
                    _this.procedures[name] = execute;
                };
            }
            Controller.$inject = ["$scope"];
            return Controller;
        })();
        Main.Controller = Controller;
    })(Main = SUI.Main || (SUI.Main = {}));
    var Procedure;
    (function (Procedure) {
        "use strict";
        var Controller = (function () {
            function Controller($scope, $parse, $log) {
                var _this = this;
                this.$scope = $scope;
                this.$parse = $parse;
                this.$log = $log;
                this.parameters = [];
                this.addParameter = function (parameterFactory) {
                    _this.parameters.push(parameterFactory);
                };
                this.removeParameter = function (parameterFactory) {
                    var i = _this.parameters.indexOf(parameterFactory);
                    if (i >= 0) {
                        _this.parameters.splice(i, 1);
                    }
                };
                this.execute = function () {
                    var procedure = {
                        name: _this.name,
                        parameters: [],
                        type: _this.type
                    };
                    angular.forEach(_this.parameters, function (parameterFactory) {
                        procedure.parameters.push(parameterFactory());
                    });
                    _this.$log.debug(angular.toJson(procedure));
                };
                this.initialize = function () {
                    var run = function () { if (_this.run !== "manual") {
                        _this.execute();
                    } };
                    _this.$scope.$watch(function () { return _this.parameters.length; }, function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            if (_this.run !== "manual") {
                                run();
                            }
                        }
                    });
                    _this.$scope.$watch(function () { return _this.run; }, function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            if (_this.run !== "manual") {
                                run();
                            }
                        }
                    });
                    run();
                };
            }
            Object.defineProperty(Controller.prototype, "name", {
                get: function () { return this.$scope.name; },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "model", {
                get: function () { return (IsBlank(this.$scope.model)) ? undefined : this.$parse(this.$scope.model)(this.$scope.$parent); },
                set: function (value) { this.$parse(this.$scope.model).assign(this.$scope.$parent, value); },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "type", {
                get: function () {
                    if (angular.isDefined(this.model)) {
                        if (IsBlank(this.$scope.type)) {
                            return (IsBlank(this.$scope.root)) ? "array" : "object";
                        }
                        else {
                            var option = Option(this.$scope.type);
                            return (["singleton", "object"].indexOf(option) >= 0) ? option : "array";
                        }
                    }
                    else {
                        return "execute";
                    }
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "root", {
                get: function () { return (this.type === "object") ? IfBlank(this.$scope.root, undefined) : undefined; },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "run", {
                get: function () {
                    var option = Option(this.$scope.run);
                    return (["auto", "once"].indexOf(option) >= 0) ? option : "manual";
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
        "use strict";
        var Controller = (function () {
            function Controller($scope, $routeParams, $parse) {
                var _this = this;
                this.$scope = $scope;
                this.$routeParams = $routeParams;
                this.$parse = $parse;
                this.factory = function () {
                    return { name: _this.name, value: _this.value, xml: _this.xml, required: _this.required };
                };
            }
            Object.defineProperty(Controller.prototype, "name", {
                get: function () { return this.$scope.name; },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "type", {
                get: function () {
                    if (IsBlank(this.$scope.type)) {
                        return (IsBlank(this.$scope.value)) ? "route" : "value";
                    }
                    else {
                        var option = Option(this.$scope.type);
                        return (["route", "scope"].indexOf(option) >= 0) ? option : "value";
                    }
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "value", {
                get: function () {
                    var value = undefined;
                    switch (this.type) {
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
                    return IfBlank(Format(value, this.$scope.format), null);
                },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "xml", {
                get: function () { return (Option(this.$scope.format) === "xml"); },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "required", {
                get: function () { return (Option(this.$scope.required) === "true"); },
                enumerable: true,
                configurable: true
            });
            Controller.$inject = ["$scope", "$routeParams", "$parse"];
            return Controller;
        })();
        Parameter.Controller = Controller;
    })(Parameter = SUI.Parameter || (SUI.Parameter = {}));
})(SUI || (SUI = {}));
var sui = angular.module("SUI", []);
sui.directive("suiProc", function () {
    return {
        restrict: "E",
        scope: { name: "@", model: "@", type: "@", root: "@", run: "@" },
        controller: SUI.Procedure.Controller,
        require: ["suiProc", "^sui"],
        link: function ($scope, iElement, iAttrs, controllers) {
            controllers[0].initialize();
        }
    };
});
sui.directive("suiProcParam", function () {
    return {
        restrict: "E",
        scope: { name: "@", type: "@", value: "@", format: "@", required: "@" },
        controller: SUI.Parameter.Controller,
        require: ["suiProcParam", "^suiProc"],
        link: function ($scope, iElement, iAttrs, controllers) {
            controllers[1].addParameter(controllers[0].factory);
            $scope.$on("$destroy", function () { controllers[1].removeParameter(controllers[0].factory); });
            $scope.$watch(function () { return controllers[0].value; }, function (newValue, oldValue) {
                if (newValue !== oldValue) {
                    if (controllers[1].run === "auto") {
                        controllers[1].execute();
                    }
                }
            });
        }
    };
});
//# sourceMappingURL=sui.js.map