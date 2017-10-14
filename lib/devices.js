'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var mdns = require ('mdns');
var os = require ('os');
var pmelog = require ('./pmelog');
var device = require ('./device');

//
//
//
var dropMyAddress = function (scanAddresses) {
  if (scanAddresses && scanAddresses.length) {
    var interfaces = os.networkInterfaces ();
    var index;

    var checkIfaces = function (deviceList) {
      _.each (deviceList, function (details) {
        if (details.family === 'IPv4')
          if ((index = _.indexOf (scanAddresses, details.address)) >= 0) {
            pmelog.llog (pmelog.DEBUG, 'Dropping my address of %s prior to scan', details.address);
            scanAddresses.splice (index, 1);
          }
      });
    };

    for (var device in interfaces)
      checkIfaces (interfaces [device]);
  }

  return scanAddresses;
};

var parseIPAddressList = function (ipList) {
  var addressList = [];
  var ip_regex = /(\d+)\.(\d+)\.(\d+)\.(\d+)((?:\/)(\d+))?/i;

  var processAddress = function (singleIP) {
    if (_.isString (singleIP)) {
      if ((singleIP.match (/[\.]/g).length !== 3) || singleIP.match (/[^0-9\.\/]/ig))
        pmelog.llog (pmelog.WARN, 'Badly formed IP address -- %s', singleIP);
      else {
        var ipFields = ip_regex.exec (singleIP);

        if (ipFields.length !== 7)
          pmelog.llog (pmelog.WARN, 'Badly formed IP address -- %s', singleIP);
        else if (!ipFields [6] || (ipFields [6] === 32))
          addressList.push (ipFields [1] + '.' + ipFields [2] + '.' + ipFields [3] + '.' + ipFields [4]);
        else if ((ipFields [6] < 8) || (ipFields [6] === 31))
          pmelog.llog (pmelog.WARN, 'Badly formed range -- %s', singleIP);
        else {
          var na = 1 << (32 - ipFields [6]);
          var mask = 0xffffffff ^ (na - 1);
          var nip = ((ipFields [1] << 24) | (ipFields [2] << 16) | (ipFields [3] << 8) | ipFields [4]) & mask;

          for (var i = 1; i < (na - 1); i++) {
            var a = nip + i;
            addressList.push (((a >> 24) & 0xff).toString () + '.' + ((a >> 16) & 0xff).toString () + '.' + ((a >> 8) & 0xff).toString () + '.' + (a& 0xff).toString ());
          }
        }
      }
    } else if (Array.isArray (singleIP)) {
      _.each (singleIP, function (e) {
        processAddress (e);
      });
    } else
      throw new Error ('ip is an unknown object');
  };

  processAddress (ipList);

  return dropMyAddress (addressList);
};

//
//  If the device isn't in the device list, then we want to poll it so we have
//  all it's interesting information. If it is in the list, then we want to
//  update our existing record with the new information. We don't want to just
//  replace it, in case we have any timers, error counts, etc.
//
var deviceAddOrUpdate = function (device, callback) {
  var self = this;
  var availabilityChanged = false;

  if (!device.getDeviceUID ()) {
    pmelog.llog (pmelog.ERROR, '%s: Device \'%s\' doesn\'t have a unique ID (ignoring)', device.getClientAddress (), device.getDeviceName ());
    return device;
  }

  if (!self._deviceList [device.getDeviceID ()]) {
    self._deviceList [device.getDeviceID ()] = device;
    pmelog.llog (pmelog.DEBUG, '%s: Device \'%s\' is new -- adding as %s (%s)', device.getClientAddress (), device.getDeviceName (), device.getDeviceID (), device.getViaBonjour () ? 'mDNS' : 'scan');
  } else {
    self._deviceList [device.getDeviceID ()].update (device);
    pmelog.llog (pmelog.DEBUG, '%s: Device \'%s\' exists -- updating as %s (%s)', device.getClientAddress (), device.getDeviceName (), device.getDeviceID (), device.getViaBonjour () ? 'mDNS' : 'scan');
  }

  if (!device.getAvailable ()) {
    device.setAvailable (true);
    availabilityChanged = true;
  }

  if (callback)
    callback (null, availabilityChanged);

  return self._deviceList [device.getDeviceID ()];
};

//
//
//
var Devices = function (accessorFunctions, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;
  self._running = false;
  self._mdnsBrowser = null;
  self._deviceList = {};     // Found devices, keyed by device unique ID (obtained during sync)
  self._deviceScanList = {}; // List of devices current being scanned for, keyed by IP address

  self._bonjour = null;
  self._ipblock = null;
  self._haveConfig = false;

  if (callback)
    callback (null, self);

  return self;
};

Devices.prototype.className = function () {
  return 'Devices';
};
Devices.prototype.updateConfig = function (newConfig) {
  var self = this;
  var restart = false;

  if (newConfig) {
    if (!_.isEqual (self._ipblock, newConfig.ipblock))
      restart = true;
    if (!_.isEqual (self._bonjour, newConfig.bonjour))
      restart = true;

    self._ipblock = newConfig.ipblock;
    self._bonjour = newConfig.bonjour;
    self._haveConfig = true;

    if ((restart && self._running) || (!self._running && self._bonjour))
      self.stop ().start ();
  }

  return self;
};
Devices.prototype.start = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (self._running) {
    // pmelog.llog (pmelog.NORMAL, 'Devices already running');

    if (callback)
      callback (null);

    return self;
  }

  if (!self._haveConfig) {
    self._bonjour = self._accessorFunctions.getConfig ().get ('devices', 'bonjour');
    self._ipblock = self._accessorFunctions.getConfig ().get ('devices', 'ipblock');
    self._haveConfig = true;
  }

  //
  //  Listen for stage devices to announce themselves. If a device comes online
  //  and isn't in the device list, then immediately poll it. If it goes
  //  off-line, then mark it as unavailable.
  //
  //  Ideally, we'd like to use the UDID of the device to store it in the
  //  deviceList table. However, when mDNS only sends the device name when it
  //  goes off-line (not even it's IP address). So we have to hope the user
  //  didn't change the name at some point.
  //
  if (self._bonjour) {
    pmelog.llog (pmelog.NORMAL, 'Starting devices Bonjour browser');
    assert (!self._mdnsBrowser, 'Devices Bonjour browser isn\'t running, but self._mdnsBrowser is not null!');

    self._mdnsBrowser = mdns.createBrowser (mdns.tcp ('practiscoresync'), {
        resolverSequence: [
          mdns.rst.DNSServiceResolve (),
          'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo () : mdns.rst.getaddrinfo ({families: [4]}),
          mdns.rst.makeAddressesUnique (),
        ],
      })
      .on ('serviceUp', function (service) {
        var d;
        var needsSyncing = false;
        var ipAddress = _.find (service.addresses, function (a) {
          return a.match (/^\d+\.\d+\.\d+\.\d+$/);
        });

        if (_.find (os.networkInterfaces (), function (iface) {return _.find (iface, function (details) {return (_.indexOf (service.addresses, details.address) === -1) ? false : true;});})) {
          pmelog.llog (pmelog.DEBUG, '%s: This is one of my interfaces. Ignoring it...', ipAddress || service.addresses);
          return;
        }

        if (!ipAddress) {
          pmelog.llog (pmelog.WARN, 'Unable to determine IPv4 address for %s, ignoring', service.name);
          // pmelog.ldirex (pmelog.DEBUG, service);
          return;
        }

        pmelog.llog (pmelog.NORMAL, '%s: PractiScore device \'%s\' now on-line', ipAddress, service.name);

        if (_.isUndefined (service.udid))
          pmelog.llog (pmelog.WARN, '%s: udid unavailable in mDNS record, can\'t confirm name', ipAddress);

        //
        //  If the device comes up, and does not exist in the table, then sync
        //  with it. If the device does exist in the table AND is auto-poll AND
        //  we need to sync with it THEN sync ELSE just mark as available.
        //
        if (self._deviceScanList [ipAddress])
          pmelog.llog (pmelog.DEBUG, '%s: Sync with this device already in progress', ipAddress);
        else {
          if ((d = _.find (self._deviceList, function (dl) { return dl.getDeviceID () === service.name; }))) {
            if (d.getAutoPoll () && d.getNeedsPolling ())
              needsSyncing = true;
          } else {
            pmelog.llog (pmelog.DEBUG, '%s: Creating new device instance', ipAddress);
            d = new device.Device (self._accessorFunctions, {clientAddress: ipAddress});

            //
            //  These are only set for bonjour-capable devices because we can
            //  be notified when they come online or go offline. Devices found
            //  via scanning won't use this, because the scan list returns
            //  their state.
            //
            /*
            d.on ('device_online', function (dev) {
              self._accessorFunctions.webNotify ('device_online', dev.getDeviceID ());
              pmelog.llog (pmelog.DEBUG, '%s: Now online: %s (bonjour)', dev.getClientAddress (), dev.getDeviceName ());
            });
            d.on ('device_offline', function (dev) {
              self._accessorFunctions.webNotify ('device_offline', dev.getDeviceID ());
              pmelog.llog (pmelog.DEBUG, '%s: Now offline: %s (bonjour)', dev.getClientAddress (), dev.getDeviceName ());
            });
            d.on ('device_synced', function (dev) {
              self._accessorFunctions.webNotify ('device_synced', dev.getDeviceID ());
              pmelog.llog (pmelog.DEBUG, '%s: Now synced: %s (bonjour)', dev.getClientAddress (), dev.getDeviceName ());
            });
            */

            needsSyncing = true;
          }

          d.setViaBonjour (true);

          if (needsSyncing) {
            pmelog.llog (pmelog.DEBUG, '%s: Sending syncing request to %s', ipAddress, service.name);

            self._deviceScanList [ipAddress] = d;

            d.sync (function (err, errDetail) {
              if (!err)
                deviceAddOrUpdate.call (self, d);
              else
                pmelog.llog (pmelog.DEBUG, '%s: bonjour sync() returned error %s, detail %s', ipAddress, err, errDetail);

              delete self._deviceScanList [ipAddress];
            });
          } else {
            pmelog.llog (pmelog.DEBUG, '%s: Marking %s as available', ipAddress, d.getDeviceID ());
            d.setAvailable (true);
          }
        }
      })
      .on ('serviceDown', function (service) {
        var d;
        var msg = '';

        if ((d = _.find (self._deviceList, function (dl) { return dl.getDeviceID () === service.name; }))) {
          d.setViaBonjour (true);
          d.setAvailable (false);
          pmelog.llog (pmelog.DEBUG, '%s: Marking %s as unavailable', d.getClientAddress (), d.getDeviceID ());
        } else
          msg = ' (device not in list)';

        pmelog.llog (pmelog.NORMAL, '%s: PractiScore device \'%s\' now off-line%s', d ? d.getClientAddress () : '???:???:???:???', service.name, msg);
      })
      .start ();

    self._running = true;
  }

  //
  //  Listen for 'device_connected' events from the server task. When a device
  //  connects, if we don't know about it, then we want to create a new entry
  //  for it.
  //
  self._accessorFunctions.getServer ().on ('device_connected', function (header) {
    var availabilityChanged;
    var d = new device.Device (self._accessorFunctions, {
      clientAddress: header.ps_host,
      clientPort:    header.ps_port,
      deviceName:    header.ps_name,
      uniqueID:      header.ps_uniqueid,
      matchID:       header.ps_matchid,
      matchName:     header.ps_matchname,
      lastModified:  header.ps_modified,
      battery:       header.ps_battery,
      hasLogs:       header.ps_logs,
    });

    //
    //  If 'd' already exists, this temporary 'd' we've just created will be
    //  replaced with the existing one. This is important because we may
    //  update the device type, and we want to update the copy we keep,
    //  not one that will disappear when it goes out of scope.
    //
    d = deviceAddOrUpdate.call (self, d, function (err, ac) {
      err = err;
      availabilityChanged = ac;
    });

    //
    //  It just talked to us, so it must be available... But we do this after
    //  deviceAddOrUpdate so the availabilityChanged status is correct.
    //
    d.setAvailable (true);

    //
    //  This really needs to be coalesced into one place. We're also trying to
    //  figure out the platform type in the talkToDevice() callback function in
    //  device.js.  If the type is already set, we'll assume it's correct.
    //
    //  iOS devices have the UDID in uppercase, while Android devices have the
    //  UDID in lowercase. Currently only iOS devices have the ps_haslogs field
    //  in the header.
    //
    if (!d.getDeviceType ()) {
      if (header.ps_platform === 'pmm')
        d.setDeviceType ('PMM');
      else if (header.ps_uniqueid) {
        if (header.ps_haslogs || header.ps_uniqueid.match (/[A-Z]/))
          d.setDeviceType ('iOS');
        else if (header.ps_uniqueid.match (/[a-z]/))
          d.setDeviceType ('Android');
      }

      if (d.getDeviceType ())
        pmelog.llog (pmelog.DEBUG, '%s: Guessed platform type as %s', d.getClientAddress (), d.getDeviceType ());
      else
        pmelog.llog (pmelog.WARN, '%s: Can\'t determine platform type!', d.getClientAddress ());
    }

    if (availabilityChanged)
      self._accessorFunctions.webNotify ('device_online', d.getDeviceID ());

    // pmelog.llog (pmelog.NORMAL, 'Header from remote device');
    // pmelog.ldir (pmelog.NORMAL, header, {depth: null, colors: true}); // DEBUG
  });

  if (callback)
    callback (null, self);

  return self;
};
Devices.prototype.stop = function (callback) {
  var self = this;

  if (self._running) {
    if (self._mdnsBrowser) {
      pmelog.llog (pmelog.NORMAL, 'Stopping devices Bonjour browser');
      self._mdnsBrowser.stop ();
      self._mdnsBrowser = null;
    }
  }

  self._running = false;

  if (callback)
    callback (null);

  return self;
};

//
//  Scans the IP address range for devices and returns a list of all devices
//  found (both existing and new).  options {clear: true} will clear the device
//  list completely. Without clear, existing devices will be replaced (after
//  being destroyed), and new devices added.
//
Devices.prototype.scan = function (options, callback) {
  var self = this;
  var ipAddresses = [];
  var ipBlock;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  if (_.keys (self._deviceScanList).length) {
    if (callback)
      callback (1);
    return false;
  }

  ipBlock = options.ipblock || self._ipblock;
  assert (!_.isEmpty (ipBlock));

  ipAddresses = parseIPAddressList (ipBlock);

  if (options.clear) {
    _.each (self._deviceList, function (d, key) {
      pmelog.llog (pmelog.DEBUG, 'Destroying device \'%s\'', key);
      d.destroy ();
    });

    self._deviceList = {};
  }

  self._deviceScanList = {};

  _.each (ipAddresses, function (ipAddress) {
    var d = new device.Device (self._accessorFunctions, {clientAddress: ipAddress});

    self._deviceScanList [ipAddress] = d;

    d.sync (function (err) {
      if (!err)
        deviceAddOrUpdate.call (self, d);
      else {
        _.each (self._deviceList, function (d) {
          if ((d.getClientAddress () === ipAddress) && d.getAvailable ()) {
            pmelog.llog (pmelog.DEBUG, '%s: Marking as no longer available', ipAddress);
            d.setAvailable (false);
          }
        });
      }

      delete self._deviceScanList [ipAddress];

      if ((_.keys (self._deviceScanList).length === 0) && callback)
        callback (null, self._deviceList);
    });
  });

  return true;
};
Devices.prototype.scanInProgress = function () {
  var self = this;
  return _.keys (self._deviceScanList).length ? true : false;
};
Devices.prototype.clear = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  if (_.keys (self._deviceScanList).length) {
    if (callback)
      callback (true, 'Scan in progress, cannot clear device list');
    return;
  }

  _.each (self._deviceList, function (d) {
    d.destroy ();
  });

  self._deviceList = {};

  if (callback)
    callback (null, 'Device list cleared');

  return self;
};
Devices.prototype.devices = function () {
  return this._deviceList;
};
Devices.prototype.getDeviceByID = function (deviceUID) {
  var self = this;
  return _.find (self._deviceList, function (d) {
    return d.getDeviceUID () === deviceUID;
  });
};
Devices.prototype.destroy = function () {
};
Devices.prototype.getInfoHash = function () {
  var self = this;
  var deviceInfo = {};

  _.each (self._deviceList, function (d) {
    var dc = d.getConfig ();
    deviceInfo [d.getDeviceID ()] = dc;
  });

  return deviceInfo;
};
Devices.prototype.getInfoArray = function (deviceList) {
  var self = this;
  var deviceInfo = [];

  _.each (self._deviceList, function (d) {
    if (!deviceList || _.contains (deviceList, d.getDeviceID ()))
      deviceInfo.push (d.getConfig ());
  });

  return deviceInfo;
};

//
//
//
exports.Devices = Devices;
