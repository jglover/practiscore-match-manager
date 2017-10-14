/* global _:false */

//
//  ProAm library for brower-side javascript
//
//  Return values:
//    0 - Unscored
//    1 - Time only score
//    2 - Points only score
//    3 - Time + points score
//    4 - DNF'ed
//    5 - Zero time
//    6 - Bad values
//
//  ProAm match has 'ProAm' and 'TimePlusCustom' stage types.
//
//
//  'ProAm' stages have a str[] array with one entry of 0 (no time), and ts[]
//  contains an array of 5 elements (hits, overtime, procedurals, bonuses, and
//  penalties). Returns 2.
//
//  'TimePlusCustom' stages have a str[] array containing string times, but an
//  empty ts[] array. Returns 1.
//
var pmelib = (function () {
  'use strict';

  pmelib = pmelib;

  return {
    shooterScored: function (score, callback) {
      if (score.dnf)
        return callback (4);
      if (!_.isArray (score.str) || !_.isArray (score.ts))
        return callback (6);
      if (score.str.length && !score.ts.length)
        return callback (1);
      if ((score.str.length === 1) && _.isArray (score.ts [0]) && (score.ts [0].length === 5))
        return callback (2);
      if (!score.str.length && !score.ts.length)
        return callback (0);

      return callback (6);
    }
  };
})();
var pmelib = (function (my) {
  'use strict';

  //
  //  Return values:
  //    0 - Unscored
  //    1 - Time only score
  //    2 - Points only score
  //    3 - Time + points score
  //    4 - DNF'ed
  //    5 - Zero time
  //    6 - Bad values
  //
  my.shooterScored = function (score, callback) {
    if (score.dnf)
      return callback (4);
    if (!_.isArray (score.str) || !_.isArray (score.ts))
      return callback (6);
    if (score.str.length && !score.ts.length)
      return callback (1);
    if ((score.str.length === 1) && _.isArray (score.ts [0]) && (score.ts [0].length === 5))
      return callback (2);
    if (!score.str.length && !score.ts.length)
      return callback (0);

    return callback (6);
  };

  return my;
}(pmelib || {}));
