'use strict';

var util = require ('util');
var Zip = require ('adm-zip');

var zf = new Zip ('../matches/RBGC_2014-07-26.psc');
var match = JSON.parse (zf.readFile ('match_def.json'));
var scores = JSON.parse (zf.readFile ('match_scores.json'));

console.log (util.inspect (match, { showHidden: true, depth: null }));
console.log (util.inspect (scores, { showHidden: true, depth: null }));

// console.dir (match.match_stages [0].stage_targets);

// var shooters = match.match_shooters;
//
//or (var i = 0; i < shooters.length; i++) {
// console.dir (shooters [i].sh_ln);
//
