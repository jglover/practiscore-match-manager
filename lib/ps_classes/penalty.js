'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

//
//  pen_bin  <boolean>
//  pen_name <string>
//  pen_val  <float>
//
var Penalty = function (options) {
  var self = this;

  options = options || {};

  self._pendingChanges = false;
  self._fieldParsed    = {};

  if (!_.isUndefined (options.enabled))
    options.enabled = options.enabled ? true : false;
  if (!_.isUndefined (options.multiple))
    options.multiple = options.multiple ? false : true;

  self.pen_enabled  = options.enabled  || true;
  self.pen_bin      = options.multiple || false;
  self.pen_name     = options.name     || '';
  self.pen_val      = options.value    || 0.00;
  self.pen_uuid     = options.uuid     || psutils.generateUUID ();

  return self;
};

Penalty.prototype.className = function () {
  return 'Penalty';
};
Penalty.prototype.isSingle = function () {
  return this.pen_bin === true;
};
Penalty.prototype.isMultiple = function () {
  return this.pen_bin === false;
};
Penalty.prototype.setBin = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setBin() argument must be boolean');
  this.pen_bin = state;
  return this;
};
Penalty.prototype.setSingle = function () {
  return this.setBin (true);
};
Penalty.prototype.setMultiple = function () {
  return this.setBin (false);
};
Penalty.prototype.getName = function () {
  return this.pen_name;
};
Penalty.prototype.setName = function (newName) {
  this.pen_name = newName || '';
  return this;
};
Penalty.prototype.getValue = function () {
  return this.pen_val;
};
Penalty.prototype.setValue = function (newValue) {
  this.pen_val = parseFloat (newValue || '0.00');
  return this;
};
Penalty.prototype.merge = function (newPenalty, options, callback) {
  var self = this;
  var err;
  var originalName = self.getName ();
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert (_.isObject (options));
  assert (_.isFunction (callback));
  assert (newPenalty, 'Penalty.prototype.merge(): newPenalty cannot be null or undefined');

  merge.compare (self, newPenalty, 'pen_bin',  function (ov, nv) {changes.push (sprintf ('    Multiple changed from %s to %s', ov, nv));});
  merge.compare (self, newPenalty, 'pen_name', function (ov, nv) {changes.push (sprintf ('    Name changed from \'%s\' to \'%s\'', ov, nv));});
  merge.compare (self, newPenalty, 'pen_val',  function (ov, nv) {changes.push (sprintf ('    Value changed from %s to %s', ov, nv));});

  if (changes.length)
    changes.unshift (sprintf ('  Penalty \'%s\' changed', originalName));

  if (err)
    pmelog.llog (pmelog.WARN, err);

  if (callback)
    callback (err, changes);

  return self;
};
Penalty.prototype.getAsPlainObject = function () {
  var self = this;
  return {
    pen_bin:   self.pen_bin,
    pen_name : self.pen_name,
    pen_val:   self.pen_val,
  };
};
Penalty.prototype.parse = function (jsonPenalty) {
  var self = this;
  var map = {
    pen_bin:  self.setBin,
    pen_name: self.setName,
    pen_val:  self.setValue,
  };

  if (!jsonPenalty)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonPenalty) {
      map [key].call (self, jsonPenalty [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  return self;
};
Penalty.prototype.compare = function (penaltyArray) {
  var self = this;

  return _.find (penaltyArray, function (penalty) {
    return (self.pen_bin === penalty.pen_bin) && (self.pen_name === penalty.pen_name) && (self.pen_val === penalty.pen_val);
  });
};

exports.Penalty = Penalty;
