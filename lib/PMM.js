'use strict';

var _ = require ('lodash');
var async = require ('async');
var psconfig = require ('./config');
var psdevices = require ('./devices');
var psfile = require ('./file');
var pskiosk = require ('./kiosk');
var psmatch = require ('./match');
var psother = require ('./other');
var psprint = require ('./practiprint');
var psserver = require ('./server');
var pssystem = require ('./system');
var pmelog = require ('./pmelog');

//
//  FIXME: Need to figure how options overrides stored configuration, etc.
//
var PMM = function (io, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  var accessorFunctions = {
    getConfig: function () {
      return self._config;
    },
    getDevices: function () {
      return self._devices;
    },
    getFile: function () {
      return self._file;
    },
    getKiosk: function () {
      return self._kiosk;
    },
    getMatch: function () {
      return self._match;
    },
    getOther: function () {
      return self._other;
    },
    getPrint: function () {
      return self._print;
    },
    getServer: function () {
      return self._server;
    },
    getSystem: function () {
      return self._system;
    },

    getMatchdef: function () {
      return self._match.matchdef ();
    },
    getScores: function () {
      return self._match.scores ();
    },

    replaceMatch: function (match) {
      match.setAccessorFunctions (self._accessorFunctions);
      self._match = match;
      self._file.masterUpdate ();
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

    updateConfig: function (newConfig) {
      pmelog.llog (pmelog.DEBUG, 'Updating configuration (accessorFunction)');

      if (newConfig) {
        self._config.updateConfig (newConfig._config);
        self._file.updateConfig (newConfig._file);
        self._kiosk.updateConfig (newConfig._kiosk);
        self._match.updateConfig (newConfig._match);
        self._other.updateConfig (newConfig._other);
        self._print.updateConfig (newConfig._print);
        self._server.updateConfig (newConfig._server);
        self._devices.updateConfig (newConfig._devices);
        self._system.updateConfig (newConfig._system);

        self._config.updateConfigEx (newConfig);
      }
      return self;
    },
  };

  self._io      = io;
  self._accessorFunctions = accessorFunctions;

  options.config  = options.config  || {};
  options.devices = options.devices || {};
  options.file    = options.file    || {};
  options.kiosk   = options.kiosk   || {};
  options.match   = options.match   || {};
  options.other   = options.other   || {};
  options.print   = options.print   || {};
  options.server  = options.server  || {};
  options.system  = options.system  || {};

  async.series (
    [
      function (callback) {
        new psconfig.Config (accessorFunctions, options.config, function (err, newObject) {
          self._config = newObject;
          callback (err);
        });
      },
      function (callback) {
        new psfile.File (accessorFunctions, options.file, function (err, newObject) {
          self._file = newObject;
          if (!err) {
            pmelog.on ('rawlog', function (logLevel, logText) {
              self._file.logfileSave (logLevel, logText);
            });
          }
          callback (err);
        });
      },
      function (callback) {
        new pskiosk.Kiosk (accessorFunctions, options.kiosk, function (err, newObject) {
          self._kiosk = newObject;
          callback (err);
        });
      },
      function (callback) {
        new psmatch.Match (accessorFunctions, options.match, function (err, newObject) {
          self._match = newObject;
          callback (err);
        });
      },
      function (callback) {
        new psother.Other (accessorFunctions, options.other, function (err, newObject) {
          self._other = newObject;
          callback (err);
        });
      },
      function (callback) {
        new psprint.Practiprint (accessorFunctions, options.print, function (err, newObject) {
          self._print = newObject;
          callback (err);
        });
      },
      function (callback) {
        new psserver.Server (accessorFunctions, options.server, function (err, newObject) {
          self._server = newObject;
          callback (err);
        });
      },
      function (callback) {
        new psdevices.Devices (accessorFunctions, options.devices, function (err, newObject) {
          self._devices = newObject;
          callback (err);
        });
      },
      function (callback) {
        new pssystem.System (accessorFunctions, options.system, function (err, newObject) {
          self._system = newObject;
          callback (err);
        });
      },
    ], function (err) {
      if (callback)
        callback (err, self);
    }
  );

  return self;
};

PMM.prototype.config = function () {
  return this._config;
};
PMM.prototype.devices = function () {
  return this._devices;
};
PMM.prototype.file = function () {
  return this._file;
};
PMM.prototype.kiosk = function () {
  return this._kiosk;
};
PMM.prototype.match = function () {
  return this._match;
};
PMM.prototype.other = function () {
  return this._other;
};
PMM.prototype.print = function () {
  return this._print;
};
PMM.prototype.server = function () {
  return this._server;
};
PMM.prototype.system = function () {
  return this._system;
};
PMM.prototype.accessorFunctions = function () {
  return this._accessorFunctions;
};

PMM.prototype.updateConfig = function (newConfig) {
  var self = this;

  pmelog.llog (pmelog.DEBUG, 'Updating configuration (updateConfig ())');

  if (newConfig) {
    self._config.updateConfig (newConfig._config);
    self._file.updateConfig (newConfig._file);
    self._kiosk.updateConfig (newConfig._kiosk);
    self._match.updateConfig (newConfig._match);
    self._other.updateConfig (newConfig._other);
    self._print.updateConfig (newConfig._print);
    self._server.updateConfig (newConfig._server);
    self._devices.updateConfig (newConfig._devices);
    self._system.updateConfig (newConfig._system);

    self._config.updateConfigEx (newConfig);
  }

  return self;
};

PMM.prototype.getCompleteMatch = function (options) {
  var self = this;
  var r = {};

  options = options || {all: true};
  options.nostringify = true;

  if (options.match   || options.all) r.m    = self.match ().matchdef ().getAsPlainObject (options) || {};
  if (options.scores  || options.all) r.s    = self.match ().scores ().getAsPlainObject (options)   || {};
  if (options.logs    || options.all) r.logs = self.match ().logs ().getAsPlainObject (options)     || {};
  if (options.lookups || options.all) r.l    = self.match ().lookups ()                             || {};
  if (options.vars    || options.all) r.v    = self.match ().vars ()                                || {};
  if (options.config  || options.all) r.c    = self.config ().getAsPlainObject (options)            || {};

  return r;
};

//
//
//
exports.PMM = PMM;
