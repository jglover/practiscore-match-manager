'use strict';

var _ = require ('lodash');
var psutils = require ('./utils');

//
//
//
var System = function (accessorFunctions, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;

  if (callback)
    callback (null, self);

  return self;
};

System.prototype.className = function () {
  return 'System';
};
System.prototype.updateConfig = function () {
  return this;
};
System.prototype.supportedMatchTypes = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  if (callback)
    callback (null, psutils.matchTypeNames ());

  return self;
};

//
//
//
exports.System = System;
