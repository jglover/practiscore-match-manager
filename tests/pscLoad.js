'use strict';

// var util = require ('util');
var match = require ('../lib/psMatch');

var m = new match.Match ('uspsa_p');
var usage = process.memoryUsage ();

console.log ('Before import:');
console.log ('  RSS = %d', usage.rss);
console.log ('  heapTotal = %d', usage.heapTotal);
console.log ('  heapUsed = %d', usage.heapUsed);

// console.log ('\'m\' Object after initialization');
// console.log (util.inspect (m, { showHidden: true, depth: null }));
console.log ('Now importing from PSC, match name is %s', m.match ().getName ());

m.file ().pscLoad ('../matches/2014_TN_State.psc', function (err, newMatch) {
  if (err)
    console.dir (err);
  else {
    m = newMatch;
  }
});

console.log ('Import complete, match name is %s', m.match ().getName ());

usage = process.memoryUsage ();

console.log ('After import:');
console.log ('  RSS = %d', usage.rss);
console.log ('  heapTotal = %d', usage.heapTotal);
console.log ('  heapUsed = %d', usage.heapUsed);

// console.log (util.inspect (m, { showHidden: true, depth: null, colors: true }));
