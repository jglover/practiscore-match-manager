//
//  Demonstrates basic match + scores + logs sync from a device
//

'use strict';

var pmelog = require ('../lib/pmelog');
var psconfig = require ('../lib/config');
var psdevice = require ('../lib/device');

pmelog.setlevel (pmelog.DEBUG);

var self = null; // 'null' should be 'this', but throws jshint strict violation

var accessorFunctions = {
  getMatch: function () {
    return self._match.match ();
  },
  getScores: function () {
    return self._match.scores ();
  },
  getConfig: function () {
    return self._config;
  },
  replaceMatch: function (match) {
    self._match = match;
    return self;
  },
  getPendingChanges: function () {
    return self._match.getPendingChanges ();
  },
  setPendingChanges: function (state) {
    self._match.setPendingChanges (state);
    return self;
  },
  webNotify: function () {
    self._io.broadcast.apply (this, arguments);
    return self;
  },
  getServer: function () {
    return self._server;
  },
};

self._config  = new psconfig.Config ();
var d = new psdevice.Device ({clientAddress: '172.16.1.10'}, accessorFunctions);

d.sync ({match: true, scores: true, logs: false}, function (err, param) {
  if (err)
    pmelog.llog (pmelog.DEBUG, "connect callback: %d", err, err ? param : '');
  else
    pmelog.ldir (pmelog.DEBUG, d, {depth: null, colors: true});
});
