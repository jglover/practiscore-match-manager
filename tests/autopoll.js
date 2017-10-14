//
//  Demonstrates basic match + scores + logs sync from a device
//

'use strict';

var device = require ('../lib/psDevice');
var pmelog = require ('../lib/pmelog');

pmelog.setlevel (pmelog.DEBUG);

var createClient = function (addr)
{
  var d = new device.Device ()
    .setClientAddress (addr)
    .setAutoPollOn ()
    .setPollAggressivelyOn ()
    .setPollIntervalAggressive (30)
    .sync ({match: true}, function (err, param) {
      if (err)
        pmelog.llog (pmelog.DEBUG, '%s: connect callback: %d', d.getClientAddress (), err, err ? param : '');
      else
        pmelog.llog (pmelog.DEBUG, '%s: Received match', d.getClientAddress ());
    });

  return d;
};

var iPad = createClient ('10.244.232.249');
var s4 = createClient ('10.244.232.250');

iPad = iPad;
s4 = s4;
