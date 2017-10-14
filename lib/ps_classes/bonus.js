'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

//
//  bon_bin  <boolean>
//  bon_name <string>
//  bon_val  <float>
//
var Bonus = function (options) {
  var self = this;

  options = options || {};

  self._pendingChanges = false;
  self._fieldParsed    = {};

  if (!_.isUndefined (options.enabled))
    options.enabled = options.enabled ? true : false;
  if (!_.isUndefined (options.multiple))
    options.multiple = options.multiple ? false : true;

  self.bon_enabled  = options.enabled  || true;
  self.bon_bin      = options.multiple || false;
  self.bon_name     = options.name     || '';
  self.bon_val      = options.value    || 0.00;
  self.bon_uuid     = options.uuid     || psutils.generateUUID ();

  return self;
};

Bonus.prototype.className = function () {
  return 'Bonus';
};
Bonus.prototype.isSingle = function () {
  return this.bon_bin === true;
};
Bonus.prototype.isMultiple = function () {
  return this.bon_bin === false;
};
Bonus.prototype.setBin = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setBin() argument must be boolean');
  this.pen_bin = state;
  return this;
};
Bonus.prototype.setSingle = function () {
  return this.setBin (true);
};
Bonus.prototype.setMultiple = function () {
  return this.setBin (false);
};
Bonus.prototype.getName = function () {
  return this.bon_name;
};
Bonus.prototype.setName = function (newName) {
  this.bon_name = newName || '';
  return this;
};
Bonus.prototype.getValue = function () {
  return this.bon_val;
};
Bonus.prototype.setValue = function (newValue) {
  this.bon_val = parseFloat (newValue || '0.00');
  return this;
};
Bonus.prototype.merge = function (newBonus, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert (_.isObject (options));
  assert (_.isFunction (callback));
  assert (newBonus, 'Bonus.prototype.merge(): newBonus cannot be null or undefined');

  merge.compare (self, newBonus, 'bon_bin',  function (ov, nv) {changes.push (sprintf ('    Multiple changed from %s to %s', ov, nv));});
  merge.compare (self, newBonus, 'bon_name', function (ov, nv) {changes.push (sprintf ('    Name changed from \'%s\' to \'%s\'', ov, nv));});
  merge.compare (self, newBonus, 'bon_val',  function (ov, nv) {changes.push (sprintf ('    Value changed from %s to %s', ov, nv));});

  if (changes.length)
    changes.unshift (sprintf ('  Bonus changed'));

  if (err)
    pmelog.llog (pmelog.WARN, err);

  if (callback)
    callback (err, changes);

  return self;
};
Bonus.prototype.getAsPlainObject = function () {
  var self = this;
  return {
    bon_bin:  self.bon_bin,
    bon_name: self.bon_name,
    bon_val:  self.bon_val,
  };
};
Bonus.prototype.parse = function (jsonBonus) {
  var self = this;
  var map = {
    bon_bin:  self.setBin,
    bon_name: self.setName,
    bon_val:  self.setValue,
  };

  if (!jsonBonus)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonBonus) {
      map [key].call (self, jsonBonus [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  return self;
};
Bonus.prototype.compare = function (bonusArray) {
  var self = this;

  return _.find (bonusArray, function (bonus) {
    return (self.bon_bin === bonus.bon_bin) && (self.bon_name === bonus.bon_name) && (self.bon_val === bonus.bon_val);
  });
};

exports.Bonus = Bonus;
