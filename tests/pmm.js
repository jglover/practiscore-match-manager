//
//  Demonstrates basic match + scores + logs sync from a device
//

'use strict';

var pmm = require ('../lib/PMM');
var pmelog = require ('../lib/pmelog');

var options = {
  config: {
  },
  match: {
  },
  devices: {
    ipblock: '10.244.232.0/24',
  },
  server: {
  },
  print: {
  },
};

pmelog.setlevel (pmelog.DEBUG);

var _pmm = new pmm.PMM (options);

_pmm.server ().start (function (remoteAddress) {
  pmelog.llog (pmelog.NORMAL, 'Returning %s for match to %s', _pmm.match ().getName (), remoteAddress);
  return {match: _pmm.match (), scores: _pmm.scores ()};
});

_pmm.print ().start ();

pmelog.llog (pmelog.NORMAL, 'Match ID is %s', _pmm.match ().getID ());
pmelog.llog (pmelog.NORMAL, 'IP scan range is %s', _pmm.config ().get ('devices', 'ipblock'));
