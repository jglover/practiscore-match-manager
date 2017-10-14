/* global _:false */

//
//  Time Plus /w Points library for brower-side javascript
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

var pmelib = (function () {
  'use strict';

  pmelib = pmelib;

  return {
    shooterScored: function (score, callback) {
      if (score.dnf)
        return callback (4);

      if (!_.isArray (score.str) || !score.str.length)
        return callback (6);

      var allStringsZero = _.every (score.str, function (time) {return _.isNumber (time) && (time === 0);});
      var allStringsNotZero = _.every (score.str, function (time) {return _.isNumber (time) && (time > 0);});

      if (allStringsNotZero)
        return callback (1);
      if (!allStringsZero)
        return callback (6);

      return callback (0);
    },
    calculateScore: function (match_bons, match_pens, stage, score, shooter) {
      var cs = {
        stage: null, shooter: null, div: null,
        del: false, dq: false, dnf: false,
        pens: [], bons: [],
        btime: 0.0, btime2: '0.00', ptime: 0.0, ptime2: '0.00',
        rtime: 0.0, rtime2: '0.00', ftime: 0.0, ftime2: '0.00',
        placeDiv: 0, placeDivOf: 0, placeOverall: 0, placeOverallOf: 0,
        noscore: 0,
      };

      if (!shooter)
        return cs;

      cs.stage = stage.stage_uuid;
      cs.shooter = shooter.sh_uid;
      cs.div = shooter.sh_dvp;
      cs.bons = score.bons || [];
      cs.pens = score.pens || [];
      cs.del = shooter.sh_del;
      cs.dq = shooter.sh_dq;
      cs.dnf = score.dnf;

      if (shooter.sh_del) {
        cs.noscore = 1000003;
        cs.dq = false;
        cs.dnf = false;
      }

      if (shooter.sh_dq) {
        cs.noscore = 1000002;
        cs.dnf = false;
      }

      if (score.dnf)
        cs.noscore = 1000001;

      if (score.str && score.str.length)
        cs.rtime = _.reduce (score.str, function (m, v) {
          return m + v;
        });
      else
        cs.rtime = 0;

      _.each (score.bons, function (b, index) {
        cs.btime += (b * match_bons [index].bon_val);
      });

      _.each (score.pens, function (p, index) {
        cs.ptime += (p * match_pens [index].pen_val);
      });

      if ((cs.ftime = (cs.rtime + cs.ptime) - cs.btime) < 0)
        cs.ftime = 0;

      cs.btime2 = cs.btime.toFixed (2);
      cs.ptime2 = cs.ptime.toFixed (2);
      cs.rtime2 = cs.rtime.toFixed (2);
      cs.ftime2 = cs.ftime.toFixed (2);

      return cs;
    },
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

    if (!_.isArray (score.str) || !score.str.length)
      return callback (6);

    var allStringsZero = _.every (score.str, function (time) {return _.isNumber (time) && (time === 0);});
    var allStringsNotZero = _.every (score.str, function (time) {return _.isNumber (time) && (time > 0);});

    if (allStringsNotZero)
      return callback (1);
    if (!allStringsZero)
      return callback (6);

    return callback (0);
  };

  my.calculateScore = function (match_bons, match_pens, stage, score, shooter) {
    var cs = {
      stage: null, shooter: null, div: null,
      del: false, dq: false, dnf: false,
      pens: [], bons: [],
      btime: 0.0, btime2: '0.00', ptime: 0.0, ptime2: '0.00',
      rtime: 0.0, rtime2: '0.00', ftime: 0.0, ftime2: '0.00',
      placeDiv: 0, placeDivOf: 0, placeOverall: 0, placeOverallOf: 0,
      noscore: 0,
    };

    if (!shooter)
      return cs;

    cs.stage = stage.stage_uuid;
    cs.shooter = shooter.sh_uid;
    cs.div = shooter.sh_dvp;
    cs.bons = score.bons || [];
    cs.pens = score.pens || [];
    cs.del = shooter.sh_del;
    cs.dq = shooter.sh_dq;
    cs.dnf = score.dnf;

    if (shooter.sh_del) {
      cs.noscore = 1000003;
      cs.dq = false;
      cs.dnf = false;
    }

    if (shooter.sh_dq) {
      cs.noscore = 1000002;
      cs.dnf = false;
    }

    if (score.dnf)
      cs.noscore = 1000001;

    if (score.str && score.str.length)
      cs.rtime = _.reduce (score.str, function (m, v) {
        return m + v;
      });
    else
      cs.rtime = 0;

    _.each (score.bons, function (b, index) {
      cs.btime += (b * match_bons [index].bon_val);
    });

    _.each (score.pens, function (p, index) {
      cs.ptime += (p * match_pens [index].pen_val);
    });

    if ((cs.ftime = (cs.rtime + cs.ptime) - cs.btime) < 0)
      cs.ftime = 0;

    cs.btime2 = cs.btime.toFixed (2);
    cs.ptime2 = cs.ptime.toFixed (2);
    cs.rtime2 = cs.rtime.toFixed (2);
    cs.ftime2 = cs.ftime.toFixed (2);

    return cs;
  };

  return my;
}(pmelib || {}));
