'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var EventEmitter = require ('events').EventEmitter;
var net = require ('net');
var pako = require ('pako');
var util = require ('util');
var pmelog = require ('./pmelog');
var psutils = require ('./utils');

//
//  All of our glorious constants
//
var PS_SIGNATURE      = 0x19113006;
var PS_HEADER_VERSION = 3;
var PS_HEADER_LENGTH  = 20;
var PS_TIMEOUT        = 5;

var PS_OFFSET_SIGNATURE     =  0;
var PS_OFFSET_PAYLOADLENGTH =  4;
var PS_OFFSET_MESSAGETYPE   =  8;
var PS_OFFSET_FLAGS         = 12;
var PS_OFFSET_TIME          = 16;

var PSMESSAGETYPE_InitHandshake       = 0x0006;
var PSMESSAGETYPE_ReplyHandshake      = 0x0007;
var PSMESSAGETYPE_RequestMatch        = 0x0008;
var PSMESSAGETYPE_SendMatch           = 0x0009;
// var PSMESSAGETYPE_RequestMatchList    = 0x000a; // Not implemented in PractiScore
// var PSMESSAGETYPE_SendMatchList       = 0x000b; // Not implemented in PractiScore
// var PSMESSAGETYPE_RequestEzWinExports = 0x000c; // Not implemented in PractiScore
// var PSMESSAGETYPE_SendEzWinExports    = 0x000d; // Not implemented in PractiScore
var PSMESSAGETYPE_RequestLogs         = 0x000e; // Present in iOS 1.6.21 (39), not in Android
var PSMESSAGETYPE_SendLogs            = 0x000f; // Response to PSMESSAGETYPE_RequestLogs

var PSERR_NONE             =  0; // No error (yay!)
var PSERR_BUSY             =  1; // This instance is already talking
var PSERR_NETWORK          =  2; // Network related error
var PSERR_JSON             =  3; // Error in header JSON
var PSERR_INFLATE          =  4; // Error trying to inflate received match data

var PSERR_NETWORK_NONE     =  0; // No error
var PSERR_NETWORK_TIMEOUT  =  1; // Timeout waiting for response
var PSERR_NETWORK_ERROR    =  2; // Generic error message
var PSERR_NETWORK_REFUSED  =  3; // Client refused our connection
var PSERR_NETWORK_TIMEDOUT =  4; // Timed out connecting to client ('connect')
var PSERR_NETWORK_CONNTO   =  5; // Timed out connecting to client (high level timer)

var pserrToText = {};
var pserrNetworkToText = {};

pserrToText [PSERR_NONE]    = 'None';
pserrToText [PSERR_BUSY]    = 'Device busy';
pserrToText [PSERR_NETWORK] = 'Network error';
pserrToText [PSERR_JSON]    = 'JSON header error';
pserrToText [PSERR_INFLATE] = 'Inflate error';

pserrNetworkToText [PSERR_NETWORK_NONE]     = 'None';
pserrNetworkToText [PSERR_NETWORK_TIMEOUT]  = 'Timeout waiting for response from client';
pserrNetworkToText [PSERR_NETWORK_ERROR]    = 'Error';
pserrNetworkToText [PSERR_NETWORK_REFUSED]  = 'Connection refused by client';
pserrNetworkToText [PSERR_NETWORK_TIMEDOUT] = 'Socket timeout';
pserrNetworkToText [PSERR_NETWORK_CONNTO]   = 'High-level timeout';

//
//
//
var debugHeaders = function (self) {
  return self._accessorFunctions.getConfig ().get ('debug', 'deviceDisplayHeaders') ? pmelog.DEBUG : pmelog.NONE;
};
var debugState = function (self) {
  return self._accessorFunctions.getConfig ().get ('debug', 'deviceDisplayState') ? pmelog.DEBUG : pmelog.NONE;
};

//
//
//
var inflateMatch = function (ipAddress, data, callback) {
  var matchDataLen = data.readUInt32BE (0);
  var matchData = data.slice (4, matchDataLen);
  var scoresData = data.slice (4 + matchDataLen);
  var hashMatchdef = {};
  var hashScores = {};
  var match;

  try {
    hashMatchdef = JSON.parse (pako.inflate (matchData, {to: 'string'}));
  } catch (e) {
    if (callback) {
      callback (PSERR_INFLATE, e);
      return;
    } else
      throw (e);
  }

  if (scoresData.length) {
    try {
      hashScores = JSON.parse (pako.inflate (scoresData, {to: 'string'}));
    } catch (e) {
      if (callback) {
        callback (PSERR_INFLATE, e);
        return;
      } else
        throw (e);
    }
  }

  match = {m: hashMatchdef, s: hashScores};

  //
  //  Shouldn't need this any more
  //
  // updateLastModified (ipAddress, match);

  if (callback)
    callback (PSERR_NONE, match);
};

//
//
//
var buildMessage = function (psMsg, payload) {
  var payloadLength = payload ? payload.length : 0;
  var b = new Buffer (PS_HEADER_LENGTH + payloadLength);
  var now = Math.round (Date.now () / 1000);

  b.writeUInt32BE (PS_SIGNATURE, PS_OFFSET_SIGNATURE);
  b.writeUInt32BE (payloadLength, PS_OFFSET_PAYLOADLENGTH);
  b.writeUInt32BE (psMsg, PS_OFFSET_MESSAGETYPE);
  b.writeUInt32BE (PS_HEADER_VERSION, PS_OFFSET_FLAGS);
  b.writeUInt32BE (now, PS_OFFSET_TIME);

  if (payloadLength) {
    if (payload.constructor === String)
      assert.ok (b.write (payload, 20) === payloadLength, 'Buffer not big enough?!? (string)');
    else if (Buffer.isBuffer (payload))
      assert.ok (payload.copy (b, 20) === payloadLength, 'Buffer not big enough?!? (buffer)');
    else
      assert.ok (0, 'Unknown variable type passed to buildMessage()');
  }

  return b;
};

//
// options{} may contain match, scores, logs
//
var talkToDevice = function (options, callback) {
  var self = this;
  var hashHeader;
  var hashMatchdef;
  var hashScores;
  var sqliteLogs;
  var jsonError;
  var inflateError;

  if (!self)
    throw new Error ('deviceObject cannot be null');
  if (!self.clientAddress)
    throw new Error ('device must have clientAddress specified');

  pmelog.llog (debugState (self), '%s: Starting communications', self.clientAddress);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  if (self.net) {
    if (callback)
      callback (PSERR_BUSY);
    return;
  }

  var ps = net.connect ({
    port: self.clientPort,
    host: self.clientAddress
  });

  ps.on ('connect', function onConnect () {
    var rxMsg = new Buffer (0);
    var lengthWanted = 0;
    var nextOn;

    //
    //  Send handshake request, want PSMESSAGETYPE_ReplyHandshake as reply
    //
    lengthWanted = PS_HEADER_LENGTH;
    nextOn = 'psHandshakeReply';
    ps.write (buildMessage (PSMESSAGETYPE_InitHandshake, JSON.stringify ({
      ps_name:      self._accessorFunctions.getConfig ().get ('server', 'name'),
      ps_port:      ps.localPort,
      ps_host:      ps.localAddress,
      ps_matchname: self._accessorFunctions.getMatchdef ().getName (),
      ps_matchid:   self._accessorFunctions.getMatchdef ().getID (),
      ps_modified:  self._accessorFunctions.getMatchdef ().getModifiedDate (),
      ps_battery:   100,
      ps_uniqueid:  self._accessorFunctions.getConfig ().get ('server', 'uuid'),
      ps_platform:  'pmm',
    })));

    //
    //  Got PSMESSAGETYPE_ReplyHandshake, now we want the handshake data
    //
    ps.on ('psHandshakeReply', function onpsHandshakeReply (header) {
      assert.equal (header.readUInt32BE (PS_OFFSET_MESSAGETYPE), PSMESSAGETYPE_ReplyHandshake, 'Did not receive PSMESSAGETYPE_ReplyHandshake message type');
      lengthWanted = header.readUInt32BE (PS_OFFSET_PAYLOADLENGTH);
      nextOn = 'psHandshakeData';
    });

    //
    //  Got the PSMESSAGETYPE_ReplyHandshake data, close the connection
    //
    ps.on ('psHandshakeData', function onpsHandshakeData (data) {
      try {
        hashHeader = JSON.parse (data);
      } catch (e) {
        pmelog.llog (pmelog.WARN, '%s: Failed to parse header JSON', self.clientAddress);
        options = {};
        jsonError = e;
      }

      pmelog.llog (debugHeaders (self), 'Device header from %s -->', self.clientAddress);
      pmelog.ldirex (debugHeaders (self), hashHeader);

      if (options.matchdef) {
        lengthWanted = PS_HEADER_LENGTH;
        nextOn = 'psSendMatchHeader';
        ps.write (buildMessage (PSMESSAGETYPE_RequestMatch));
      } else if (options.logs && hashHeader.ps_haslogs) {
        lengthWanted = PS_HEADER_LENGTH;
        nextOn = 'psSendLogsHeader';
        ps.write (buildMessage (PSMESSAGETYPE_RequestLogs));
      } else
        ps.end ();
    });

    //
    //  Got PSMESSAGETYPE_SendMatch, now we want the match data
    //
    ps.on ('psSendMatchHeader', function onpsSendMatchHeader (header) {
      assert.equal (header.readUInt32BE (PS_OFFSET_MESSAGETYPE), PSMESSAGETYPE_SendMatch, 'Did not receive PSMESSAGETYPE_SendMatch message type');
      lengthWanted = header.readUInt32BE (PS_OFFSET_PAYLOADLENGTH);
      nextOn = 'psSendMatchData';
    });

    //
    //  Got the PSMESSAGETYPE_SendMatch data, we're done!
    //
    ps.on ('psSendMatchData', function onpsSendMatchData (data) {
      inflateMatch (self.clientAddress, data, function inflateComplete (err, param) {
        if (err === PSERR_NONE) {
          if (_.isObject (param)) {
            hashMatchdef = param.m;

            if (options.scores)
              hashScores = param.s;
          } else
            throw new Error ('err == PSERR_NONE but parameter is not object');
        } else {
          options = {};
          inflateError = param;
        }
      });

      if (options.logs && hashHeader.ps_haslogs) {
        lengthWanted = PS_HEADER_LENGTH;
        nextOn = 'psSendLogsHeader';
        ps.write (buildMessage (PSMESSAGETYPE_RequestLogs));
      } else
        ps.end ();
    });

    //
    //  Got PSMESSAGETYPE_SendLogs, now we want the log data
    //
    ps.on ('psSendLogsHeader', function onpsSendLogsHeader (header) {
      assert.equal (header.readUInt32BE (PS_OFFSET_MESSAGETYPE), PSMESSAGETYPE_SendLogs, 'Did not receive PSMESSAGETYPE_SendLogs message type');
      lengthWanted = header.readUInt32BE (PS_OFFSET_PAYLOADLENGTH);
      nextOn = 'psSendLogsData';
    });

    //
    //  Got the PSMESSAGETYPE_SendLogs data, we're done!
    //
    ps.on ('psSendLogsData', function onpsSendLogsData (data) {
      sqliteLogs = data;
      ps.end ();
    });

    ps.on ('data', function onData (data) {
      rxMsg = Buffer.concat ([rxMsg, data]);

      while (rxMsg.length >= lengthWanted) {
        var thisMsg = new Buffer (lengthWanted);
        rxMsg.copy (thisMsg, 0, 0, lengthWanted);
        rxMsg = rxMsg.slice (lengthWanted);
        pmelog.llog (debugState (self), '%s: nextOn=%s', self.clientAddress, nextOn);
        ps.emit (nextOn, thisMsg);
      }
    });
  });

  var shutdown = function (networkError) {
    pmelog.llog (debugState (self), '%s: shutdown called with networkError=%d, self.net %s', self.clientAddress, networkError, self.net ? 'exists' : 'does not exist');

    if (self.netTimer) {
      clearTimeout (self.netTimer);
      delete self.netTimer;
    }

    if (self.net) {
      delete self.net;

      if (callback) {
        if (networkError !== PSERR_NETWORK_NONE)
          callback (PSERR_NETWORK, networkError);
        else if (jsonError)
          callback (PSERR_JSON, jsonError);
        else if (inflateError)
          callback (PSERR_INFLATE, inflateError);
        else {
          if (self._accessorFunctions.getConfig ().get ('debug', 'deviceSaveData'))
            self._accessorFunctions.getFile ().debugSave ({header: hashHeader, matchdef: hashMatchdef, scores: hashScores});

          callback (PSERR_NONE, {header: hashHeader, matchdef: hashMatchdef, scores: hashScores, logs: sqliteLogs});
        }
      }
    }
  };

  ps.on ('close', function onClose (hadError) {
    pmelog.llog (debugState (self), '%s: net close, hadError=%s', self.clientAddress, hadError);
    shutdown (PSERR_NETWORK_NONE);
  });

  ps.on ('end', function onEnd () {
    pmelog.llog (debugState (self), '%s: net end', self.clientAddress);
    shutdown (PSERR_NETWORK_NONE);
  });

  ps.on ('timeout', function onTimeout () {
    pmelog.llog (debugState (self), '%s: net timeout', self.clientAddress);
    ps.end ();
    shutdown (PSERR_NETWORK_TIMEOUT);
  });

  ps.on ('error', function onError (e) {
    var err;

    pmelog.llog (debugState (self), '%s: net err', self.clientAddress);

    if (e.code === 'ECONNREFUSED')
      err = PSERR_NETWORK_REFUSED;
    else if (e.code === 'ETIMEDOUT')
      err = PSERR_NETWORK_TIMEDOUT;
    else {
      err = PSERR_NETWORK_ERROR;
      pmelog.llog (debugState (self), '%s: Non-specific error message %s', self.clientAddress, e.code);
    }

    ps.end ();
    shutdown (err);
  });

  self.netTimer = setTimeout (function () {
    pmelog.llog (debugState (self), '%s: net timer kill', self.clientAddress);
    shutdown (PSERR_NETWORK_CONNTO);
    ps.destroy ();
  }, (self._accessorFunctions.getConfig ().get ('devices', 'scanTime') || PS_TIMEOUT) * 1000);

  self.net = ps;
};

//
//
//
var updateSyncTimer = function () {
  var self = this;

  if (self.syncTimer) {
    clearTimeout (self.syncTimer);
    self.syncTimer = null;
    self.tsNextPoll = null;
  }

  if (self.autoPoll && self.autopollCallback) {
    var timeoutInMs = (self.pollAggressively ? self._accessorFunctions.getConfig ().get ('devices', 'autopollFailed') : self._accessorFunctions.getConfig ().get ('devices', 'autopollSuccess')) * 1000;

    self.pollInterval = timeoutInMs;
    self.syncTimer = setTimeout (self.sync.bind (self), timeoutInMs, self.syncOptions, self.autopollCallback);
    self.tsNextPoll = psutils.timeStampFutureLocal (timeoutInMs);

    pmelog.llog (debugState (self), '%s: Next poll will be at %s', self.clientAddress, self.tsNextPoll);
  }

  return self;
};

//
//
//
var Device = function (accessorFunctions, options, callback) {
  var self = this;

  EventEmitter.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;

  //
  //  Obtained from handshaking with client, or as options
  //
  self.clientAddress = options.clientAddress || null;
  self.clientPort    = options.clientPort    || 59613;
  self.deviceName    = options.deviceName    || null;
  self.battery       = options.battery       || null;
  self.hasLogs       = options.hasLogs       || false;
  self.lastModified  = options.lastModified  || null;
  self.matchID       = options.matchID        ? options.matchID.toUUIDCase () : null;
  self.matchName     = options.matchName     || null;
  self.uniqueID      = options.uniqueID      || null;

  self.autoPoll         = false;
  self.pollAggressively = false;
  self.deviceNameShort  = self.deviceName ? self.deviceName.substring (0, self.deviceName.lastIndexOf (':')).replace (/\\'/g, "'") : null;

  //
  //  Obtained from syncing with client
  //
  self.matchdef = null;
  self.scores   = null;
  self.logs     = null;

  //
  //  Internal values
  //
  self.deviceType       = null;  // iOS, Android, PMM
  self.bCanHaveLogs     = false; // Device can support logs
  self.bAvailable       = false; // Device is online (mDNS sets true or false)
  self.bAvailableTS     = null;  // Timestamp device last changed state via Bonjour
  self.tsLastSync       = null;  // Timestamp of last time successfully synced
  self.bViaBonjour      = false; // Device was added via Bonjour vs probing
  self.errorCount       = 0;     // Number of errors when talking to device
  self.bHidden          = false; // Device has been hidden in the Manage->Devices view
  self.pollCount        = 0;     // Number of times we've tried to poll
  self.pollInterval     = 0;     // Number of milliseconds until next poll, 0 until first poll request
  self.syncTimer        = null;  // Timer instance
  self.tsLastPoll       = null;  // Timestamp of last poll (regardless of errors)
  self.tsNextPoll       = null;  // Timestamp of next poll
  self.tsLastError      = null;  // Timestamp of last error condition
  self.bLastPollFailed  = false; // Indicates last communications attempt failed
  self.autopollCallback = null;  // Callback function when autopoll timer fires

  if (callback)
    callback (null);

  return self;
};

util.inherits (Device, EventEmitter);

Device.prototype.className = function () {
  return 'Device';
};
Device.prototype.updateConfig = function () {
  return this;
};
Device.prototype.setAutoPoll = function (state) {
  if (state !== this.autoPoll) {
    this.autoPoll = state ? true : false;
    updateSyncTimer.call (this);
  }
  return this;
};
Device.prototype.getAutoPoll  = function () {
  return this.autoPoll;
};
Device.prototype.setPollAggressively = function (state) {
  if (state !== this.pollAggressively) {
    this.pollAggressively = state ? true : false;
    updateSyncTimer.call (this);
  }
  return this;
};
Device.prototype.getAvailable = function () {
  return this.bAvailable;
};
Device.prototype.setAvailable = function (state) {
  var self = this;

  if (state !== self.bAvailable) {
    self.bAvailable = state ? true : false;
    self.bAvailableTS = psutils.timeStampLocal ();

    if (self.getViaBonjour () && self.getDeviceID ()) {
      self._accessorFunctions.webNotify (state ? 'device_online' : 'device_offline', self.getDeviceID ());
      pmelog.llog (pmelog.DEBUG, '%s: Now %sline: %s (bonjour)', self.getClientAddress (), state ? 'on' : 'off', self.getDeviceName ());
    }
  }

  return self;
};
Device.prototype.getAvailableTimestamp = function () {
  return this.bAvailableTS;
};
Device.prototype.getClientAddress = function () {
  return this.clientAddress;
};
Device.prototype.getDeviceName = function () {
  return this.deviceName;
};
Device.prototype.getDeviceNameShort = function () {
  return this.deviceNameShort;
};
Device.prototype.getDeviceID = function () {
  //
  //  FIXME: Ideally, we'd like this to be the UDID of the device. Currently,
  //  the UDID isn't sent in the Bonjour TXT field, and because Bonjour only
  //  sends the device name (and no other fields) when the device
  //  disconnects, we're forced to use the name. Which, unfortunately, the
  //  user can change inside of PractiScore...
  //
  return this.deviceName;
};
Device.prototype.getDeviceUID = function () {
  return this.uniqueID;
};
Device.prototype.getDeviceType = function () {
  return this.deviceType;
};
Device.prototype.setDeviceType = function (deviceType) {
  this.deviceType = deviceType;
  return this;
};
Device.prototype.getBattery = function () {
  return this.battery;
};
Device.prototype.getHasLogs = function () {
  return this.hasLogs;
};
Device.prototype.getLastModified = function () {
  return this.lastModified;
};
Device.prototype.getMatchID = function () {
  return this.matchID;
};
Device.prototype.getMatchName = function () {
  return this.matchName;
};
Device.prototype.getLastSyncTime = function () {
  return this.tsLastSync;
};
Device.prototype.getViaBonjour = function () {
  return this.bViaBonjour;
};
Device.prototype.setViaBonjour = function (state) {
  this.bViaBonjour = state ? true : false;
  return this;
};
Device.prototype.clearErrorCount = function () {
  this.errorCount = 0;
  return this;
};
Device.prototype.getErrorCount = function () {
  return this.errorCount;
};
Device.prototype.setHidden = function (state) {
  this.bHidden = state ? true : false;
  return this;
};
Device.prototype.getPollCount = function () {
  return this.pollCount;
};
Device.prototype.getLastPollTime = function () {
  return this.tsLastPoll;
};
Device.prototype.getNextPollTime = function () {
  return this.tsNextPoll;
};
Device.prototype.getLastErrorTime = function () {
  return this.tsLastError;
};
Device.prototype.getNeedsPolling = function () {
  return this.bLastPollFailed;
};
Device.prototype.getMatchdef = function () {
  return this.matchdef;
};
Device.prototype.getScores = function () {
  return this.scores;
};
Device.prototype.getLogs = function () {
  return this.logs;
};
Device.prototype.getConfig = function () {
  var self = this;
  return {
    ipAddress:              self.clientAddress,
    autopoll:               self.autoPoll,
    lastheard:              self.tsLastSync,
    nextpoll:               self.tsNextPoll,
    pollcount:              self.pollCount,
    failures:               self.errorCount,
    interval:               self.pollInterval,
    pollInterval:           self._accessorFunctions.getConfig ().get ('devices', 'autopollSuccess'),
    pollIntervalAggressive: self._accessorFunctions.getConfig ().get ('devices', 'autopollFailed'),
    available:              self.bAvailable,
    hidden:                 self.bHidden,
    deviceType:             self.deviceType,
    ps_battery:             self.battery,
    ps_haslogs:             self.hasLogs,
    ps_host:                self.clientAddress,
    ps_matchid:             self.matchID,
    ps_matchname:           self.matchName,
    ps_modified:            self.lastModified,
    ps_name:                self.deviceName,
    ps_nameshort:           self.deviceNameShort,
    ps_uniqueid:            self.uniqueID,
  };
};

//
//  Methods
//
Device.prototype.destroy = function () {
  if (this.netTimer) {
    clearTimeout (this.netTimer);
    delete this.netTimer;
  }

  if (this.net) {
    this.net.destroy ();
    delete this.net;
  }

  if (this.syncTimer) {
    clearTimeout (this.syncTimer);
    delete this.syncTimer;
  }

  return this;
};
Device.prototype.update = function (newDevice) {
  var self = this;

  self.deviceName      = newDevice.deviceName;
  self.deviceNameShort = newDevice.deviceNameShort;
  self.battery         = newDevice.battery;
  self.hasLogs         = newDevice.hasLogs;
  self.lastModified    = newDevice.lastModified;
  self.matchID         = newDevice.matchID;
  self.matchName       = newDevice.matchName;
  self.uniqueID        = newDevice.uniqueID;

  self.matchdef        = newDevice.matchdef;
  self.scores          = newDevice.scores;
  self.logs            = newDevice.logs;

  self.deviceType      = newDevice.deviceType;
  self.bAvailable      = newDevice.bAvailable;
  self.bViaBonjour     = newDevice.bViaBonjour || self.bViaBonjour;
  self.bCanHaveLogs    = newDevice.bCanHaveLogs;
  self.bHidden         = newDevice.bHidden || self.bHidden;

  return self;
};
Device.prototype.sync = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  self.syncOptions = {
    matchdef: (options.matchdef || options.all) ? true : false,
    scores:   (options.scores   || options.all) ? true : false,
    logs:     (options.logs     || options.all) ? true : false,
  };

  if (options.autopollCallback)
    self.autopollCallback = callback;

  talkToDevice.call (self, self.syncOptions, function (err, param) {
    if (!err) {
      if (!param.header)
        throw new Error ('No error, but header is empty?');

      self.battery         = param.header.ps_battery   || null;
      self.hasLogs         = param.header.ps_haslogs   || false;
      self.lastModified    = param.header.ps_modified  || null;
      self.matchID         = param.header.ps_matchid   || null;
      self.matchName       = param.header.ps_matchname || null;
      self.deviceName      = param.header.ps_name      || '(Unknown)';
      self.uniqueID        = param.header.ps_uniqueid  || null;

      self.bCanHaveLogs    = !_.isUndefined (param.header.ps_haslogs);

      self.matchID         = self.matchID.toUUIDCase ();
      self.deviceNameShort = self.deviceName ? self.deviceName.substring (0, self.deviceName.lastIndexOf (':')).replace (/\\'/g, "'") : null;

      //
      //  iOS devices have the UDID in uppercase, while Android devices have
      //  the UDID in lowercase. Currently, only iOS devices have the
      //  ps_haslogs field in the header.
      //
      if (param.header.ps_platform === 'pmm')
        self.deviceType  = 'PMM';
      else if ((param.matchdef && (param.matchdef.device_arch && (param.matchdef.device_arch === 'android'))) || (param.header.ps_uniqueid && param.header.ps_uniqueid.match (/[a-z]/)))
        self.deviceType  = 'Android';
      else if (self.bViaBonjour || param.header.ps_uniqueid && param.header.ps_uniqueid.match (/[A-Z]/))
        self.deviceType  = 'iOS';
      else
        self.deviceType = '(Unknown)';

      self.matchdef = param.matchdef || {};
      self.scores   = param.scores   || {};
      self.logs     = param.logs     || {};

      var tempTime = psutils.timeStampLocal ();

      if (param.matchdef || param.scores || param.logs)
        self.tsLastSync = tempTime;

      self.tsLastPoll = tempTime;
      self.bLastPollFailed = false;

      self._accessorFunctions.webNotify ('device_synced', self.getDeviceID ());
      pmelog.llog (pmelog.DEBUG, '%s: Now synced: %s (bonjour)', self.getClientAddress (), self.getDeviceName ());
    } else {
      self.tsLastError = psutils.timeStampLocal ();
      self.bLastPollFailed = true;
    }

    //
    //  For Android, a sync failure marks us unavailable, and success marks
    //  us available. This is going to catch PMM also, but I'm not sure that
    //  would ever actually happen, or would be a problem.
    //
    //  If we're not an iOS device, and we have an error, switch to polling
    //  aggressively. For an iOS device, we'll catch it next time it comes
    //  up on the network via a Bonjour event, and we'll poll it then.
    //
    if (!self.bViaBonjour) {
      self.setAvailable (err ? false : true);
      self.setPollAggressively (err ? true : false);
    }

    //
    //  Sometimes iOS devices seem to fall off of Bonjour, but they're really
    //  still there. If we're an iOS device and successfully polled, we'll
    //  force marking ourself as available.
    //
    if (self.bViaBonjour && !err)
      self.setAvailable (true);

    if (err) {
      if (err === PSERR_NETWORK)
        param = pserrNetworkToText [param] || 'Unknown network sub-error';
      err = pserrToText [err] || 'Unknown err';
    }

    if (callback)
      callback (err, param);
  });

  return updateSyncTimer.call (self);
};
Device.prototype.syncMatchdef = function (options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }
  return this.sync (_.merge (options, {matchdef: true}), callback);
};
Device.prototype.syncScores = function (options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }
  return this.sync (_.merge (options, {matchdef: true, scores: true}), callback);
};
Device.prototype.syncLogs = function (options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }
  return this.sync (_.merge (options, {logs: true}), callback);
};
Device.prototype.syncAll = function (options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }
  return this.sync (_.merge (options, {all: true}), callback);
};

//
//
//
exports.Device = Device;
