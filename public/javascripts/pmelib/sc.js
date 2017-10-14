/* global _:false */
/* jshint devel:true */

//
//  Steel Challenge library for brower-side javascript
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
  //  One string is allowed to be zero.
  //  If all times are zero and there are no penalties, the stage is unscored
  //  If all times are not zero, the stage is scored
  //  If a time is 0 and there are penalties, then we have bad data
  //
  my.shooterScored = function (score, callback) {
    var nonZeroStrings = 0;
    var badData = false;

    if (score.dnf)
      return callback (4);  // DNF'ed

    if (!_.isArray (score.str) || !score.str.length)
      return callback (6);  // Bad values

    _.each (score.str, function (stringTime) {
      if (stringTime !== 0.0)
        nonZeroStrings++;
      else if (_.sum (score.penss))
        badData = true;
    });

    if (badData)
      return callback (6); // Any penalties but no time in a string is bad data

    if (nonZeroStrings >= (score.str.length - 1))
      return callback (1);  // Time only score

    return callback (0);  // Unscored (2 or more strings with 0's)
  };

  //
  //  Steel Challenge score calculation is pretty straight forward. Sort the
  //  scores array by (which has already had the penalties added in), then
  //  remove the last one.
  //
  //  Sort order will be scored shooters, incomplete scores, DNF, then DQ'ed.
  //  To achieve this, DQ'ed shooters will have a time of 100003 seconds, DNF's
  //  will be 100002, incompletes will be 100001. It's pretty unlikely anyone
  //  will have a valid time of 100000 or more...
  //
  //  No distinction in the final time is made, e.g. a 20 raw time with a 10
  //  penalty is the same as a 10 second raw time with a 20 second penalty.
  //
  my.calculateScore = function (score, shooter) {
    if (!score || !shooter) {
      alert ("Eeek! calculateScore passed a bad parameter. Check Javascript console");
      console.log ('score -->');
      console.dir (score);
      console.log ('shooter -->');
      console.dir (shooter);
      return;
    }

    delete score._fieldParsed;
    delete score._pendingChanges;
    delete score.aprv;
    delete score.dname;
    delete score.dqr;
    delete score.mod;
    delete score.penr;
    delete score.poph;
    delete score.popm;
    delete score.ts;
    delete score.udid;

    if (shooter.sh_dq)
      score.total = 100003;
    else if (score.dnf)
      score.total = 100002;
    else {
      my.shooterScored (score, function (code) {
        if (code !== 1)
          score.total = 100001;
      });
    }

    return score;
  };

  return my;
}(pmelib || {}));
