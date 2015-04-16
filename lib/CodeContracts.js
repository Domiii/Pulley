/**
 * Copied from: http://jstest.codeplex.com/wikipage?title=JavaScript%20Code%20Contract%20Library
 * Original author: Chris Baxter
 * See: http://stackoverflow.com/questions/4445582/javascript-code-contract-libraries
 */

 // domi edit
/**
 * @const
 */ 
ContractsEnabled = true;


// Original library:
var Contracts = (function () {
  function hasValue(value) {
    return typeof (value) !== "undefined" && value !== null;
  }

  function throwExceptionIf(condition, message) {
    if (condition) {
      throw { message: message };
    }
  }

  var _value = null;

  // *** DefaultVerifier ***
  var _defaultVerifier = {
    type: "DefaultVerifier",
    getValue: function () {
      return _value;
    }
  };

  // *** ArrayVerifier ***
  var _arrayVerifier = {
    type: "ArrayVerifier",
    getValue: function () {
      return _value;
    },
    withLengthOf: function (length) {
      var value = _value;

      throwExceptionIf(typeof (length) !== "number", "Length must be a 'Number'.");
      throwExceptionIf(hasValue(value) && value.length !== length, "The length of the specified array must be exactly '" + length + "' items.");

      return _arrayVerifier;
    },
    withMinimumLengthOf: function (length) {
      var value = _value;

      throwExceptionIf(typeof (length) !== "number", "Length must be a 'Number'.");
      throwExceptionIf(hasValue(value) && value.length < length, "The length of the specified array must be '" + length + "' or more items.");

      return _arrayVerifier;
    },
    withMaximumLengthOf: function (length) {
      var value = _value;

      throwExceptionIf(typeof (length) !== "number", "Length must be a 'Number'.");
      throwExceptionIf(hasValue(value) && value.length > length, "The length of the specified array must be '" + length + "' or less items.");

      return _arrayVerifier;
    }
  };

  // *** ComparableVerifier ***
  var _comparableVerifier = {
    type: "ComparableVerifier",
    getValue: function () {
      return _value;
    },
    lessThan: function (val) {
      var value = _value;
      var valueSpecified = hasValue(value);

      throwExceptionIf(valueSpecified && typeof (value) !== typeof (val), "Comparison value must be of the same type.");
      throwExceptionIf(valueSpecified && value >= val, "The specified value must be less than '" + val + "'.");

      return _comparableVerifier;
    },
    lessThanOrEqualTo: function (val) {
      var value = _value;
      var valueSpecified = hasValue(value);

      throwExceptionIf(valueSpecified && typeof (value) !== typeof (val), "Comparison value must be of the same type.");
      throwExceptionIf(valueSpecified && value > val, "The specified value must be less than or equal to '" + val + "'.");

      return _comparableVerifier;
    },
    equalTo: function (val) {
      var value = _value;
      var valueSpecified = hasValue(value);

      throwExceptionIf(valueSpecified && typeof (value) !== typeof (val), "Comparison value must be of the same type.");
      throwExceptionIf(valueSpecified && value != val, "The specified value must be equal to '" + val + "'.");

      return _comparableVerifier;
    },
    notEqualTo: function (val) {
      var value = _value;
      var valueSpecified = hasValue(value);

      throwExceptionIf(valueSpecified && typeof (value) !== typeof (val), "Comparison value must be of the same type.");
      throwExceptionIf(valueSpecified && value == val, "The specified value must not be equal to '" + val + "'.");

      return _comparableVerifier;
    },
    greaterThanOrEqualTo: function (val) {
      var value = _value;
      var valueSpecified = hasValue(value);

      throwExceptionIf(valueSpecified && typeof (value) !== typeof (val), "Comparison value must be of the same type.");
      throwExceptionIf(valueSpecified && value < val, "The specified value must be greater than or equal to '" + val + "'.");

      return _comparableVerifier;
    },
    greaterThan: function (val) {
      var value = _value;
      var valueSpecified = hasValue(value);

      throwExceptionIf(valueSpecified && typeof (value) !== typeof (val), "Comparison value must be of the same type.");
      throwExceptionIf(valueSpecified && value <= val, "The specified value must be greater than '" + val + "'.");

      return _comparableVerifier;
    },
    between: function (lowerBound, upperBound) {
      var value = _value;
      var valueSpecified = hasValue(value);

      throwExceptionIf(valueSpecified && typeof (value) !== typeof (lowerBound), "Comparison lowerBound must be of the same type.");
      throwExceptionIf(valueSpecified && typeof (value) !== typeof (upperBound), "Comparison upperBound must be of the same type.");
      throwExceptionIf(valueSpecified && (value < lowerBound || value > upperBound), "The specified value must be between '" + lowerBound + "' and '" + upperBound + "'.");

      return _comparableVerifier;
    }
  };

  // *** StringVerifier ***
  var _stringVerifier = {
    type: "StringVerifier",
    getValue: function () {
      return _value;
    },
    withLengthOf: function (length) {
      var value = _value;

      throwExceptionIf(typeof (length) !== "number", "Length must be a 'Number'.");
      throwExceptionIf(hasValue(value) && value.length !== length, "The length of the specified string must be exactly '" + length + "' characters.");

      return _stringVerifier;
    },
    withMinimumLengthOf: function (length) {
      var value = _value;

      throwExceptionIf(typeof (length) !== "number", "Length must be a 'Number'.");
      throwExceptionIf(hasValue(value) && value.length < length, "The length of the specified string must be '" + length + "' or more characters.");

      return _stringVerifier;
    },
    withMaximumLengthOf: function (length) {
      var value = _value;

      throwExceptionIf(typeof (length) !== "number", "Length must be a 'Number'.");
      throwExceptionIf(hasValue(value) && value.length > length, "The length of the specified string must be '" + length + "' or less characters.");

      return _stringVerifier;
    },
    containing: function (str) {
      var value = _value;

      str = (str || "").toString();

      throwExceptionIf(hasValue(value) && value.indexOf(str) === -1, "The specified string must contain '" + str + "'.");

      return _stringVerifier;
    },
    startingWith: function (str) {
      var value = _value;

      str = (str || "").toString();

      throwExceptionIf(hasValue(value) && value.indexOf(str) !== 0, "The specified string must start with '" + str + "'.");

      return _stringVerifier;
    },
    endingWith: function (str) {
      var value = _value;

      str = (str || "").toString();

      throwExceptionIf(hasValue(value) && value.lastIndexOf(str) !== (value.length - str.length), "The specified string must end with '" + str + "'.");

      return _stringVerifier;
    },
    matching: function (pattern) {
      var value = _value;
      var regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);

      throwExceptionIf(hasValue(value) && !regex.test(value), "The specified string must match the pattern '" + pattern + "'.");

      return _stringVerifier;
    }
  };

  // *** TypeVerifier ***
  var _typeVerifier = {
    type: "TypeVerifier",
    getValue: function () {
      return _value;
    },
    isAnything: function () {
      return _defaultVerifier;
    },
    isArray: function () {
      var value = _value;

      throwExceptionIf(hasValue(value) && !(value instanceof Array), "Value must be of type 'Array'.");

      return _arrayVerifier;
    },
    isBoolean: function () {
      var value = _value;

      throwExceptionIf(hasValue(value) && typeof (value) !== "boolean", "Value must be of type 'Boolean'.");

      return _defaultVerifier;
    },
    isChar: function () {
      var value = _value;

      throwExceptionIf(hasValue(value) && (typeof (value) !== "string" || value.length !== 1), "Value must be of type 'String' containing only a single character.");

      return _comparableVerifier;
    },
    isDate: function () {
      var value = _value;

      throwExceptionIf(hasValue(value) && !(value instanceof Date), "Value must be of type 'Date'.");

      return _comparableVerifier;
    },
    isFunction: function () {
      var value = _value;

      throwExceptionIf(hasValue(value) && typeof (value) !== "function", "Value must be of type 'Function'.");

      return _defaultVerifier;
    },
    isInstanceOf: function (type) {
      var value = _value;

      throwExceptionIf(hasValue(value) && !((value) instanceof type), "Value must be of specified type.");

      return _defaultVerifier;
    },
    isNumber: function () {
      var value = _value;

      throwExceptionIf(hasValue(value) && typeof (value) !== "number", "Value must be of type 'Number'.");

      return _comparableVerifier;
    },
    isObject: function () {
      var value = _value;

      throwExceptionIf(hasValue(value) && typeof (value) !== "object", "Value must be of type 'Object'.");

      return _defaultVerifier;
    },
    isString: function () {
      var value = _value;

      throwExceptionIf(hasValue(value) && typeof (value) !== "string", "Value must be of type 'String'.");

      return _stringVerifier;
    }
  };

  // *** RequiredVerifier ***
  var _requiredVerifier = {
    type: "RequiredVerifier",
    getValue: function () {
      return _value;
    },
    always: function () {
      var value = _value;

      throwExceptionIf(typeof (value) === "undefined" || value === null, "Value must not be 'null' or 'undefined'.");

      return _typeVerifier;
    },
    whenDefined: function () {
      var value = _value;

      throwExceptionIf(value === null, "Value must not be 'null'.");

      return _typeVerifier;
    },
    whenHasValue: function () {
      return _typeVerifier;
    },
    whenNotNull: function () {
      var value = _value;

      throwExceptionIf(typeof (value) === "undefined", "Value must not be 'undefined'.");

      return _typeVerifier;
    }
  };

  return {
    value: function (value) {
      _value = value;
      return _requiredVerifier;
    }
  };
})();


// domi edit
Contracts.Check = function() {
    if (!ContractsEnabled) return;
    
    for (var i = 0; i < arguments.length; ++i) {
        
    }
};