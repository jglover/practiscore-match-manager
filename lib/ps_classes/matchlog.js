'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var pmelog = require ('../pmelog');

//
//
//
var storeToDatabase = function (options, callback) {
  var self = this;

  if (!options.sqlFile || !Buffer.isBuffer (options.sqlFile))
    return;

  self._accessorFunctions.getFile ().matchlogMerge (options, function (err) {
    if (err) {
      pmelog.llog (pmelog.ERROR, 'matchlogMerge() failed, clear=%s: %s', options.clear, err);

      if (callback)
        callback (err);
    } else {
      self.fetch (options, function (e) {
        if (e)
          pmelog.llog (pmelog.ERROR, 'fetch() failed: ' + e);

        if (callback)
          callback (e);
      });
    }
  });

  return self;
};

//
//
//
var MatchLog = function (accessorFunctions, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;
  self.logs = [];

  if (callback)
    callback (null, self);

  return self;
};

MatchLog.prototype.className = function () {
  return 'MatchLog';
};
MatchLog.prototype.setAccessorFunctions = function (accessorFunctions) {
  this._accessorFunctions = accessorFunctions;
};
MatchLog.prototype.fetch = function (options, callback) {
  var self = this;

  assert (options);
  assert (options.matchID);

  self._accessorFunctions.getFile ().matchlogFetch (options, function (err, matchlogRecords) {
    if (!err)
      self.logs = matchlogRecords;
    if (callback)
      callback (err, matchlogRecords);
  });

  return self;
};
MatchLog.prototype.replace = function (matchID, sqlFile, callback) {
  return storeToDatabase.call (this, {sqlFile: sqlFile, clear: true, matchID: matchID}, callback);
};
MatchLog.prototype.merge = function (matchID, sqlFile, callback) {
  return storeToDatabase.call (this, {sqlFile: sqlFile, clear: false, matchID: matchID}, callback);
};
MatchLog.prototype.getAsPlainObject = function () {
  return this._logs;
};

//
//
//
exports.MatchLog = MatchLog;
