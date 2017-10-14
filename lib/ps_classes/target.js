'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var pmelog = require ('../pmelog');

//
//
//
var Target = function (targetNumber) {
  var self = this;

  self._pendingChanges = false;
  self._fieldParsed    = {};

  self.target_deleted  = false;
  self.target_number   = parseInt (targetNumber || 1);
  self.target_precval  = 1; // FIXME Move to match type
  self.target_reqshots = 0;

  return self;
};

Target.prototype.className = function () {
  return 'Target';
};
Target.prototype.getDeleted = function () {
  return this.target_deleted;
};
Target.prototype.isDeleted = function () {
  return this.target_deleted;
};
Target.prototype.isNotDeleted = function () {
  return !this.target_deleted;
};
Target.prototype.setDeleted = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setDeleted() argument must be boolean');
  this.target_deleted = state;
  return this;
};
Target.prototype.setIsDeleted = function () {
  return this.setDeleted (true);
};
Target.prototype.setIsNotDeleted = function () {
  return this.setDeleted (false);
};
Target.prototype.getNumber = function () {
  return this.target_number;
};
Target.prototype.setNumber = function (newNumber) {
  this.target_number = parseInt (newNumber || 0);
  return this;
};
Target.prototype.getPrecisionValue = function () {
  return this.target_precval;
};
Target.prototype.setPrecisionValue = function (newPV) {
  this.target_precval = newPV || 1;
  return this;
};
Target.prototype.getRequiredHits = function () {
  return this.target_reqshots;
};
Target.prototype.setRequiredHits = function (newHits) {
  this.target_reqshots = parseInt (newHits || 0);
  return this;
};
Target.prototype.fixup = function () {
  return this;
};
Target.prototype.merge = function (newTarget, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert (_.isObject (options), 'Target.prototype.merge: options is not Object');
  assert (_.isFunction (callback), 'Target.prototype.merge: callback is not function');
  assert (newTarget, 'Target.prototype.merge(): newTarget cannot be null or undefined');

  merge.compare (self, newTarget, 'target_deleted',  function (ov, nv) {changes.push (sprintf ('      Deleted changed from %s to %s', ov, nv));});
  merge.compare (self, newTarget, 'target_number',   function (ov, nv) {changes.push (sprintf ('      Number changed from %s to %s', ov, nv));});
  merge.compare (self, newTarget, 'target_precval',  function (ov, nv) {changes.push (sprintf ('      Precision value changed from %s to %s', ov, nv));});
  merge.compare (self, newTarget, 'target_reqshots', function (ov, nv) {changes.push (sprintf ('      Required shots changed from %s to %s', ov, nv));});

  if (_.isFunction (options.onChangeTarget))
    options.onChangeTarget (self, newTarget, changes);

  if (changes.length)
    changes.unshift (sprintf ('    Target #%s modified:', self.getNumber ()));

  if (err)
    pmelog.llog (pmelog.WARN, err);

  if (callback)
    callback (err, changes);

  return self;
};
Target.prototype.getAsPlainObject = function (options) {
  var self = this;
  var t = {};
  var notcompact = !options || !options.compact;

  if (notcompact || self.target_deleted)  t.target_deleted  = self.target_deleted;
  if (notcompact || self.target_number)   t.target_number   = self.target_number;
  if (notcompact || self.target_precval)  t.target_precval  = self.target_precval;  // FIXME Move to match type
  if (notcompact || self.target_reqshots) t.target_reqshots = self.target_reqshots;

  return t;
};
Target.prototype.parse = function (jsonTarget) {
  var self = this;
  var map = {
    target_deleted:  self.setDeleted,
    target_number:   self.setNumber,
    target_precval:  self.setPrecisionValue,// FIXME Move to match type
    target_reqshots: self.setRequiredHits,
  };

  if (!jsonTarget)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonTarget) {
      map [key].call (self, jsonTarget [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  return self;
};

exports.Target = Target;
