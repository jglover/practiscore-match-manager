'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var EventEmitter = require ('events').EventEmitter;
var mdns = require ('mdns');
var net = require ('net');
var pako = require ('pako');
var util = require ('util');
var pmelog = require ('./pmelog');

//
//
//
var PS_SIGNATURE      = 0x19113006;
var PS_HEADER_VERSION = 3;
var PS_HEADER_LENGTH  = 20;

var PS_OFFSET_SIGNATURE     =  0;
var PS_OFFSET_PAYLOADLENGTH =  4;
var PS_OFFSET_MESSAGETYPE   =  8;
var PS_OFFSET_FLAGS         = 12;
var PS_OFFSET_TIME          = 16;

var PSMESSAGETYPE_InitHandshake       = 0x0006;
var PSMESSAGETYPE_ReplyHandshake      = 0x0007;
var PSMESSAGETYPE_RequestMatch        = 0x0008;
var PSMESSAGETYPE_SendMatch           = 0x0009;

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
//
//
var deflateMatch = function (matchAndScores, callback) {
  var list = [];
  var input;
  var compressedData;
  var compressedLen;

  assert (matchAndScores.match || matchAndScores.scores, 'No match or scores in deflateMatch()');

  if (matchAndScores.match) {
    // pmelog.llog (pmelog.NORMAL, 'Match --->'); // DEBUG
    // pmelog.ldir (pmelog.NORMAL, matchAndScores.match, {depth: null, colors: true}); // DEBUG
    input = new Buffer (JSON.stringify (matchAndScores.match));
    compressedData = new Buffer (pako.deflate (input));
    compressedLen = new Buffer (4);
    compressedLen.writeUInt32BE (compressedData.length, 0);
    list.push (compressedLen, compressedData);
  }

  if (matchAndScores.scores) {
    // pmelog.llog (pmelog.NORMAL, 'Scores --->'); // DEBUG
    // pmelog.ldir (pmelog.NORMAL, matchAndScores.scores, {depth: null, colors: true}); // DEBUG
    input = new Buffer (JSON.stringify (matchAndScores.scores));
    compressedData = new Buffer (pako.deflate (input));
    list.push (compressedData);
  }

  var deflatedMatch = Buffer.concat (list);

  if (callback)
    callback (0, deflatedMatch);

  return deflatedMatch;
};

//
//
//
var Server = function (accessorFunctions, options, callback) {
  var self = this;

  EventEmitter.call (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;
  self._running = false;
  self._netServer = null;
  self._mdns = null;

  self._server = null;
  self._port = null;
  self._name = null;
  self._uuid = null;
  self._ipv6 = null;
  self._announce = null;
  self._haveConfig = false;

  if (callback)
    callback (null, self);

  return self;
};

util.inherits (Server, EventEmitter);

Server.prototype.className = function () {
  return 'Server';
};
Server.prototype.updateConfig = function (newConfig) {
  var self = this;
  var restart = false;

  if (newConfig) {
    if (!_.isEqual (self._server, newConfig.server))
      restart = true;
    if (!_.isEqual (self._port, newConfig.port))
      restart = true;
    if (!_.isEqual (self._name, newConfig.name))
      restart = true;
    if (!_.isEqual (self._uuid, newConfig.uuid))
      restart = true;
    if (!_.isEqual (self._ipv6, newConfig.ipv6))
      restart = true;
    if (!_.isEqual (self._announce, newConfig.announce))
      restart = true;

    self._server = newConfig.server;
    self._port = newConfig.port;
    self._name = newConfig.name;
    self._uuid = newConfig.uuid;
    self._ipv6 = newConfig.ipv6;
    self._announce = newConfig.announce;
    self._haveConfig = true;

    if ((restart && self._running) || (!self._running && self._server))
      self.stop ().start ();
  }

  return self;
};
Server.prototype.start = function (options, callback) {
  var self = this;
  var WANT_HEADER = 0;
  var WANT_DATA = 1;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (self._running) {
    // pmelog.llog (pmelog.NORMAL, 'PractiScore server already running (%s:%s)', self._addr || '(not set)', self._port || '(not set)');

    if (callback)
      callback (null);

    return self;
  }

  if (!self._haveConfig) {
    self._server = self._accessorFunctions.getConfig ().get ('server', 'server');
    self._port = self._accessorFunctions.getConfig ().get ('server', 'port');
    self._name = self._accessorFunctions.getConfig ().get ('server', 'name');
    self._uuid = self._accessorFunctions.getConfig ().get ('server', 'uuid');
    self._ipv6 = self._accessorFunctions.getConfig ().get ('server', 'ipv6');
    self._announce = self._accessorFunctions.getConfig ().get ('server', 'announce');
    self._haveConfig = true;
  }

  self._addr = self._ipv6 ? '::0' : '0.0.0.0';

  if (self._server) {
    pmelog.llog (pmelog.NORMAL, 'Starting PractiScore server (%s:%s)', self._addr, self._port);
    assert (!self._netServer, 'PractiScore server isn\'t running, but _netServer is not null!');

    if (self._announce) {
      pmelog.llog (pmelog.NORMAL, 'PractiScore server will announce via Bonjour');
      assert (!self._mdns, 'PractiScore Bonjour announcer isn\'t running, but self._mdns is not null!');
      self._mdns = mdns.createAdvertisement (mdns.tcp ('practiscoresync'), self._port, {txtRecord: {uuid: self._uuid}});
      self._mdns.start ();
    }

    self._netServer = net.createServer (function (conn) {
      var want = WANT_HEADER;
      var rxMsg = new Buffer (0);
      var rxHeader = new Buffer (PS_HEADER_LENGTH);
      var rxData;
      var remoteAddress = conn.remoteAddress;
      var remotePort = conn.remotePort;
      var remoteName = '(unknown)';
      var receivedHandshake = false;

      pmelog.llog (pmelog.INFO, 'Client %s:%s connected', remoteAddress, remotePort);

      function processInitHandshake () {
        if (rxData && rxData.length) {
          var json = JSON.parse (rxData.toString ()) || null;
          self.emit ('device_connected', json);
          remoteName = json.ps_name || remoteName;
          pmelog.llog (pmelog.INFO, '%s:%s claims to be "%s"', remoteAddress, remotePort, remoteName);
        } else
          pmelog.llog (pmelog.INFO, '%s:%s didn\' tell us who they are', remoteAddress, remotePort);

        pmelog.llog (pmelog.INFO, '%s:%s (%s) being told I am "%s" @ %s:%s with match "%s"', remoteAddress, remotePort, remoteName, self._name, conn.localAddress, conn.localPort, self._accessorFunctions.getMatchdef ().getName ());

        conn.write (buildMessage (PSMESSAGETYPE_ReplyHandshake, JSON.stringify ({
          ps_name:      self._name,
          ps_port:      conn.localPort,
          ps_host:      conn.localAddress,
          ps_matchname: self._accessorFunctions.getMatchdef ().getName (),
          ps_matchid:   self._accessorFunctions.getMatchdef ().getID (),
          ps_modified:  self._accessorFunctions.getMatchdef ().getModifiedDate (),
          ps_battery:   100,
          ps_uniqueid:  self._uuid,
          ps_platform:  'pmm',
        })));

        receivedHandshake = true;
      }

      function processReplyHandshake () {
        if (rxData && rxData.length) {
          var json = JSON.parse (rxData.toString ()) || null;
          self.emit ('device_connected', json);
          remoteName = json.ps_name || remoteName;
          pmelog.llog (pmelog.INFO, '%s:%s still claims to be "%s"', remoteAddress, remotePort, remoteName);
        } else
          pmelog.llog (pmelog.WARN, '%s:%s still didn\' tell us who they are', remoteAddress, remotePort);
      }

      function processRequestMatch () {
        pmelog.llog (pmelog.INFO, '%s:%s (%s) is requesting the current match (handshake %sreceived)', remoteAddress, remotePort, remoteName, receivedHandshake ? '' : 'not ');
        conn.write (buildMessage (PSMESSAGETYPE_SendMatch, deflateMatch ({
          match: self._accessorFunctions.getMatchdef ().getAsPlainObject ({compact: true}),
          scores: self._accessorFunctions.getScores ().getAsPlainObject ({compact: true}),
        })));
      }

      conn.on ('data', function onData (data) {
        rxMsg = Buffer.concat ([rxMsg, data]);

        while (rxMsg.length && (rxMsg.length >= ((want === WANT_HEADER) ? rxHeader.length : rxHeader.readUInt32BE (PS_OFFSET_PAYLOADLENGTH))))
        {
          var ready = false;

          if ((want === WANT_HEADER) && (rxMsg.length >= rxHeader.length)) {
            rxMsg.copy (rxHeader, 0, 0, rxHeader.length);

            if (rxHeader.readUInt32BE (PS_OFFSET_PAYLOADLENGTH)) {
              rxMsg = rxMsg.slice (rxHeader.length);
              rxData = new Buffer (0);
              want = WANT_DATA;
            } else {
              rxMsg = new Buffer (0);
              rxData = null;
              ready = true;
            }
          }
          else if ((want === WANT_DATA) && (rxMsg.length >= rxHeader.readUInt32BE (PS_OFFSET_PAYLOADLENGTH))) {
            rxData = new Buffer (rxHeader.readUInt32BE (PS_OFFSET_PAYLOADLENGTH));
            rxMsg.copy (rxData, 0, 0, rxData.length);
            rxMsg = rxMsg.slice (rxData.length);
            want = WANT_HEADER;
            ready = true;
          }

          if (ready) {
            switch (rxHeader.readUInt32BE (PS_OFFSET_MESSAGETYPE)) {
              case PSMESSAGETYPE_InitHandshake :
                processInitHandshake ();
                break;
              case PSMESSAGETYPE_ReplyHandshake :
                processReplyHandshake ();
                break;
              case PSMESSAGETYPE_RequestMatch :
                processRequestMatch ();
                break;
              default :
                pmelog.llog (pmelog.WARN, 'Received unexpected message request %d from client, closing connection', rxHeader.readUInt32BE (PS_OFFSET_MESSAGETYPE));
                conn.end ();
                break;
            }
          }
        }
      });

      conn.on ('close', function onClose () {
        pmelog.llog (pmelog.INFO, '%s:%s (%s) disconnected', remoteAddress, remotePort, remoteName);
      });

      conn.on ('timeout', function onTimeout () {
        pmelog.llog (pmelog.WARN, '%s:%s (%s) timed out', remoteAddress, remotePort, remoteName);
        conn.end ();
      });

      conn.on ('error', function onError () {
        pmelog.llog (pmelog.WARN, '%s:%s (%s) errored out', remoteAddress, remotePort, remoteName);
        conn.end ();
      });
    }).on ('error', function (err) {
      if (err.errno === 'EADDRINUSE') {
        pmelog.llog (pmelog.CRITICAL, "Eeek! %s:%s appears to be in use already. Is another instance running?\n", self._addr, self._port);
        process.exit (0);
      }
      else
        throw (err);
    }).listen (self._port, self._addr);

    self._running = true;
  }

  if (callback)
    callback (null);

  return self;
};
Server.prototype.stop = function (callback) {
  var self = this;

  if (self._running) {
    if (self._mdns) {
      pmelog.llog (pmelog.NORMAL, 'Stopping PractiScore server Bonjour announcements');
      self._mdns.stop ();
      self._mdns = null;
    }
    if (self._netServer) {
      pmelog.llog (pmelog.NORMAL, 'Stopping PractiScore server (%s:%s)', self._addr, self._port);
      self._netServer.close ();
      self._netServer = null;
    }
  }

  self._running = false;

  if (callback)
    callback (null);

  return self;
};

//
//
//
exports.Server = Server;
