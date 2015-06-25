/// <reference path="../typings/angularjs/angular.d.ts" />
/// <reference path="../typings/angularjs/angular-route.d.ts" />
/// <reference path="../typings/moment/moment.d.ts" />
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
    function Option(value, defaultValue, allowedValues) {
        if (defaultValue === void 0) { defaultValue = ""; }
        if (allowedValues === void 0) { allowedValues = []; }
        var option = angular.lowercase(String(value)).trim();
        if (allowedValues.length > 0) {
            var found = false;
            angular.forEach(allowedValues, function (allowedValue) {
                if (angular.lowercase(allowedValue).trim() === option) {
                    found = true;
                }
            });
            if (!found) {
                option = undefined;
            }
        }
        return IfBlank(option, angular.lowercase(defaultValue).trim());
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
                        if (angular.lowercase(formatted).indexOf("invalid") >= 0) {
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
            function Controller($scope, $log) {
                var _this = this;
                this.$scope = $scope;
                this.$log = $log;
                this.procedures = {};
                this.addProcedure = function (name, execute) {
                    _this.procedures[name] = execute;
                };
                this.removeProcedure = function (name) {
                    if (angular.isDefined(_this.procedures[name])) {
                        delete _this.procedures[name];
                    }
                };
                this.execute = function (name) { _this.procedures[name](); };
            }
            Controller.$inject = ["$scope", "$log"];
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
                this.empty = function () { if (!IsBlank(_this.$scope.model)) {
                    _this.model = (_this.type === "array") ? [] : {};
                } };
                this.execute = function () {
                    _this.empty();
                    var procedure = {
                        name: _this.name, parameters: [], type: _this.type
                    };
                    angular.forEach(_this.parameters, function (parameterFactory) {
                        procedure.parameters.push(parameterFactory());
                    });
                    _this.$log.debug("Execute:" + angular.toJson(procedure));
                };
                this.initialize = function () {
                    _this.$scope.$watch(function () { return _this.parameters.length; }, function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            if (_this.run === "auto") {
                                _this.execute();
                            }
                        }
                    });
                    _this.$scope.$watch(function () { return _this.run; }, function (newValue, oldValue) {
                        if (newValue !== oldValue) {
                            if (_this.run !== "manual") {
                                _this.execute();
                            }
                        }
                    });
                    if (_this.run !== "manual") {
                        _this.execute();
                    }
                    else {
                        _this.empty();
                    }
                };
            }
            Object.defineProperty(Controller.prototype, "name", {
                get: function () { return this.$scope.name; },
                enumerable: true,
                configurable: true
            });
            Object.defineProperty(Controller.prototype, "alias", {
                get: function () { return IfBlank(this.$scope.alias, this.$scope.name); },
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
                    if (IsBlank(this.$scope.model)) {
                        return "execute";
                    }
                    else {
                        if (IsBlank(this.$scope.type)) {
                            return (IsBlank(this.$scope.root)) ? "array" : "object";
                        }
                        else {
                            return Option(this.$scope.type, "array", ["singleton", "object"]);
                        }
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
                get: function () { return Option(this.$scope.run, "manual", ["auto", "once"]); },
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
                        return Option(this.$scope.type, "value", ["route", "scope"]);
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
                            value = this.$routeParams[IfBlank(this.$scope.value, this.$scope.name)];
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
var sui = angular.module("sui", []);
sui.directive("sui", function () {
    return {
        restrict: "E",
        scope: {},
        controller: SUI.Main.Controller,
        require: ["sui"],
        link: function ($scope, iElement, iAttrs, controllers) { }
    };
});
sui.directive("suiProc", function () {
    return {
        restrict: "E",
        scope: { name: "@", model: "@", type: "@", root: "@", run: "@" },
        controller: SUI.Procedure.Controller,
        require: ["suiProc", "?^sui"],
        link: function ($scope, iElement, iAttrs, controllers) {
            controllers[0].initialize();
            if (controllers[1] !== null) {
                controllers[1].addProcedure(controllers[0].alias, controllers[0].execute);
                $scope.$on("$destroy", function () { controllers[1].removeProcedure(controllers[0].alias); });
            }
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