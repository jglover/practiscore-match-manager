'use strict';

var uspsa = require ('../lib/psUSPSA');
var pmelog = require ('../lib/pmelog');

var match = new uspsa.uspsaMatch ();

match.importFromSSI ('../matches/EWS_RBGC_USPSA_20140920.zip', function (err) {
  if (err)
    pmelog.llog (pmelog.ERROR, err);
});

pmelog.llog (pmelog.NORMAL, 'Match name is %s', match.getName ());
pmelog.ldir (pmelog.NORMAL, match, {depth: null, colors: true});
