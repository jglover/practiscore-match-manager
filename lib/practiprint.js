/* jshint eqnull:true */

'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var http = require ('http');
var mdns = require ('mdns');
var qs = require ('querystring');
var url = require ('url');
var pmelog = require ('./pmelog');

//
//
//
var Practiprint = function (accessorFunctions, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;
  self._running = false;
  self._httpServer = null;
  self._mdnsBrowser = null;
  self._mdnsList = {};

  self._haveConfig = false;
  self._server = null;
  self._port = null;
  self._method = null;
  self._announce = null;

  if (callback)
    callback (null, self);

  return self;
};

Practiprint.prototype.className = function () {
  return 'Practiprint';
};
Practiprint.prototype.updateConfig = function (newConfig) {
  var self = this;
  var restart = false;

  if (newConfig) {
    if (!_.isEqual (self._port, newConfig.port))
      restart = true;
    if (!_.isEqual (self._announce, newConfig.announce))
      restart = true;

    self._server = newConfig.server;
    self._port = newConfig.port;
    self._method = newConfig.method;
    self._announce = newConfig.announce;
    self._haveConfig = true;

    if ((restart && self._running) || (!self._running && self._server))
      self.stop ().start ();
  }

  return self;
};
Practiprint.prototype.start = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (self._running) {
    // pmelog.llog (pmelog.NORMAL, 'PractiPrint server already running (port %d)', self._port);

    if (callback)
      callback (null);

    return self;
  }

  if (!self._haveConfig) {
    self._server = self._accessorFunctions.getConfig ().get ('print', 'server');
    self._port = self._accessorFunctions.getConfig ().get ('print', 'port');
    self._method = self._accessorFunctions.getConfig ().get ('print', 'method');
    self._announce = self._accessorFunctions.getConfig ().get ('print', 'announce');
    self._haveConfig = true;
  }

  function printJob (stageNumber, printerInfo, queryParams) {
    var options = {
      host: printerInfo.address,
      port: printerInfo.port,
      path: printerInfo.path + '?' + qs.stringify (queryParams),
    };

    pmelog.llog (pmelog.NORMAL, 'Routing print request from stage %s to printer %s', stageNumber, printerInfo.address);

    http.request (options, function (res) {
      pmelog.llog (pmelog.NORMAL, 'Print request from stage %s to printer %s returned %s', stageNumber, printerInfo.address, (res.statusCode === 200) ? 'OK' : res.statusCode);
    }).on ('error', function (e) {
      pmelog.llog (pmelog.WARN, 'Print request from stage %s to printer %s failed with %s', stageNumber, printerInfo.address, e.message);
    }).end ();
  }

  function extractStageNumber (stageName) {
    var re = /^(\d+):/;
    var stageNumber = stageName.match (re);

    if (stageNumber)
      return stageNumber [1];

    pmelog.llog (pmelog.WARN, 'Malformed stage name (not preceeded by stage number) for stage \'%s\'', stageName);

    return 0;
  }

  function forwardRequest (queryParams, clientAddress) {
    if (!_.keys (self._mdnsList).length)
      pmelog.llog (pmelog.WARN, 'No printers available to satisfy print request from client %s. Discarding.', clientAddress);
    else if (!queryParams.stagename)
      pmelog.llog (pmelog.WARN, 'No stage name in print request from client %s', clientAddress);
    else {
      var stageNumber = extractStageNumber (queryParams.stagename);
      var defaultPrinterInfo = self._mdnsList [_.keys (self._mdnsList) [0]];

      if (!stageNumber) {
        pmelog.llog (pmelog.WARN, 'Malformed stage name (not preceeded by stage number) for stage \'%s\', using default printer %s', queryParams.stagename, defaultPrinterInfo.address);
        printJob ('<unknown>', defaultPrinterInfo, queryParams);
      } else if (!self._mdnsList [stageNumber]) {
        pmelog.llog (pmelog.WARN, 'No route defined for printing a request from stage %s, using default printer %s', stageNumber, defaultPrinterInfo.address);
        printJob (stageNumber, defaultPrinterInfo, queryParams);
      } else {
        printJob (stageNumber, self._mdnsList [stageNumber], queryParams);
      }
    }
  }

  //
  //
  //
  if (self._server) {
    pmelog.llog (pmelog.NORMAL, 'Starting PractiPrint server (port %s)', self._port);

    self._httpServer = http.createServer (function (request, response) {
      pmelog.llog (pmelog.NORMAL, 'Client IP address in request is %s', request.connection.remoteAddress);

      if (request.method === 'POST') {
        var body='';

        request.on ('data', function (data) {
          body +=data;
        });

        request.on ('end', function () {
          var POST = qs.parse (body);
          response.writeHead (200);
          response.write (JSON.stringify (POST));
          response.end ();
        });
      }
      else if (request.method === 'GET') {
        var url_parts = url.parse (request.url, true);
        response.writeHead (200);
        response.write (JSON.stringify (url_parts.query));
        response.end ();
        forwardRequest (url_parts.query, request.connection.remoteAddress);
      }
    }).on ('connect', function (sock) {
      pmelog.llog (pmelog.NORMAL, 'Client IP address at connect is %s', sock.remoteAddress);
    }).on ('error', function (err) {
      if (err.errno === 'EADDRINUSE') {
        pmelog.llog (pmelog.CRITICAL, "\nPractiPrint: Eeek! Port %d appears to be in use already. Is another instance running?\n", self._port);
        process.exit (0);
      }
      else
        throw (err);
    }).listen (self._port);

    self._running = true;
  }

  //
  //
  //
  if (self._server && self._announce) {
    pmelog.llog (pmelog.NORMAL, 'PractiPrint server will announce via Bonjour');
    assert (!self._mdnsBrowser, 'PractiPrint Bonjour browser isn\'t running, but self._mdnsBrowser is not null!');

    self._mdnsBrowser = mdns.createBrowser (mdns.tcp ('practiprint'))
      .on ('serviceUp', function (service) {
        var re = /.*(\d+)$/;
        var stageNumber = service.name.match (re);

        if (stageNumber)
          stageNumber = stageNumber [1];
        else if (service.txtRecord && service.txtRecord.stage)
          stageNumber = service.txtRecord.stage;

        if (stageNumber) {
          try {
            self._mdnsList [stageNumber] = {};
            self._mdnsList [stageNumber].port = service.port;
            self._mdnsList [stageNumber].address = _.find (service.addresses, function (a) { return a.indexOf ('.') !== -1; });
            self._mdnsList [stageNumber].path = service.txtRecord.path || '';

            pmelog.llog (pmelog.NORMAL, 'PractiPrint printer \'%s\' (%s) for stage %s now on-line', service.name, self._mdnsList [stageNumber].address, stageNumber);
          } catch (e) {
            pmelog.llog (pmelog.ERROR, 'Unable to extract necessary information from \'%s\' (%s) for stage %s', service.name, self._mdnsList [stageNumber].address, stageNumber);
            pmelog.llog (pmelog.ERROR, 'Error was \'%s\'', e);
          }
        } else
          pmelog.llog (pmelog.ERROR, 'Can\'t find stage number in service name \'%s\'', service.name);
      })
      .on ('serviceDown', function (service) {
        pmelog.llog (pmelog.NORMAL, 'PractiPrint stage printer \'%s\' now off-line', service.name);
        delete self._mdnsList [service.name];
      })
      .start ();
  }

  if (callback)
    callback (null);

  return self;
};
Practiprint.prototype.stop = function (callback) {
  var self = this;

  if (self._running) {
    if (self._mdnsBrowser) {
      pmelog.llog (pmelog.NORMAL, 'Stopping PractiPrint server Bonjour browser');
      self._mdnsBrowser.stop ();
      self._mdnsBrowser = null;
    }
    if (self._httpServer) {
      pmelog.llog (pmelog.NORMAL, 'Stopping PractiPrint server (port %d)', self._port);
      self._httpServer.close ();
      self._httpServer = null;
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
exports.Practiprint = Practiprint;
