//
//  Demonstrates basic match + scores + logs sync from a device
//

'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var devices = require ('../lib/psStuff');
var pmelog = require ('../lib/pmelog');

// var addressBlock = '172.16.1.0/24';
var addressBlock = '10.244.232.0/24';

pmelog.setlevel (pmelog.DEBUG);

var d = new devices.Devices ({debug: false});

d.scan (addressBlock, function (deviceList) {
  _.each (deviceList, function (dl) {
    pmelog.llog (pmelog.NORMAL, '%s: Match name is \'%s\'', dl.getClientAddress (), dl.getMatchName ());
  });
});

assert (!d.scan (addressBlock));
