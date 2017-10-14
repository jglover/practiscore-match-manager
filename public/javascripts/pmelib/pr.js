//
//  Precision Rifle library for brower-side javascript
//
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
    score = score;
    return callback (0);
  };

  return my;
}(pmelib || {}));
