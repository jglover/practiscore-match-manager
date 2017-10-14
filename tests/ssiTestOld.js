'use strict';

var util = require ('util');
var ssi = require ('../lib/ssi');

var matchData = ssi.ssiImportOld ('EWS_river_bend_uspsa_9202014.zip');

console.log (util.inspect (matchData, { showHidden: true, depth: null }));
