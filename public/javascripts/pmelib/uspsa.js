/* global _:false */

//
//  USPSA library for browser-side JavaScript
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
  //  USPSA match has 'Comstock', 'Virginia' and 'Fixed' stage types.
  //
  //  'Comstock' stages have a str[] array with the number of strings for the
  //  stage, ts[] is an array of target hits (if paper targets are defined), and
  //  poph/popm has the number, and poph/popm has the number of popper hits and
  //  misses. Returns 3.
  //
  //  'Virgina' stages have a str[] array with the number of strings for the
  //  stage, ts[] is an array of target hits (if paper targets are defined), and
  //  poph/popm has the number, and poph/popm has the number of popper hits and
  //  misses (steel not technically legal, but such a stage may be defined).
  //  Returns 3.
  //
  //  'Fixed' stages have a str[] with one entry of 0 (no time), ts[] is an array
  //  of target hits (if paper targets are defined), and poph/popm has the number
  //  of popper hits and misses (steel not technically legal, but such a stage
  //  may be defined). Returns 2.
  //
  my.shooterScored = function (score, callback) {
    if (score.dnf)
      return callback (4);  // DNF'ed

    if (!_.isArray (score.str) || !_.isArray (score.ts) || !score.str.length)
      return callback (6);  // Bad values

    var allStringsZero = _.every (score.str, function (time) {return _.isNumber (time) && (time === 0);});
    var allStringsNotZero = _.every (score.str, function (time) {return _.isNumber (time) && (time > 0);});
    var allTargetsZero = _.every (score.ts, function (hits) {return _.isNumber (hits) && (hits === 0);});
    var anyTargetsNotZero = _.any (score.ts, function (hits) {return _.isNumber (hits) && (hits > 0);});
    var anySteel = score.poph + score.popm;
    var noSteel = ((score.poph + score.popm) === 0);

    if ((score.str.length === 1) && allStringsZero && (!allTargetsZero || anySteel))
      return callback (2); // Points only score
    if (allStringsNotZero && ((anyTargetsNotZero && noSteel) || (anyTargetsNotZero || anySteel)))
      return callback (3); // Time + points score
    if (!allStringsZero || anyTargetsNotZero || anySteel)
      return callback (6); // Bad values

    return callback (0);  // Unscored
  };

  //
  //  Calculates the hf, total points, penalities, etc for a single score.
  //
  my.calculateScore = function (stage, score, shooter) {
    var bcPoints = 3;
    var dPoints = 1;
    var cs = {
      shooter: null, div: null, pf: 0,
      del: false, dq: false, dnf: false,
      time: 0.0, time2: 0.00, points: 0, penalty: 0,
      total: 0, hf: 0.0, hf4: 0.0000,
      a: 0, b: 0, c: 0, d: 0, m: 0, ns: 0, npm: 0, sh: 0, sm: 0, st: 0,
      p: 0, ap: 0,
      paperp: 0, steelp: 0, procp: 0, mp: 0, smp: 0, nsp: 0,
      spct_o: 0, spts_o: 0, spct_d: 0, spts_d: 0,
      placeDiv: 0, placeDivOf: 0, placeOverall: 0, placeOverallOf: 0,
    };

    if (!shooter)
      return cs;

    if (shooter.sh_pf === 'MAJOR') {
      bcPoints = 4;
      dPoints = 2;
      cs.pf = 1;
    }

    cs.shooter = shooter.sh_uid;
    cs.div = shooter.sh_dvp;

    if (shooter.sh_del) {
      cs.del = shooter.sh_del;
      return cs;
    }

    if (shooter.sh_dq) {
      cs.dq = shooter.sh_dq;
      return cs;
    }

    if (score.dnf) {
      cs.dnf = score.dnf;
      return cs;
    }

    if (score.str && score.str.length)
      cs.time = _.reduce (score.str, function (m, v) { return m + v; });
    else
      cs.time = 0;

    cs.a = 0;
    cs.b = 0;
    cs.c = 0;
    cs.d = 0;
    cs.m = 0;
    cs.ns = 0;
    cs.npm = 0;
    cs.sh = score.poph || 0;
    cs.sm = score.popm || 0;
    cs.st = cs.sh + cs.sm;
    cs.p = score.proc || 0;
    cs.ap = score.apen || 0;

    if (score.ts && score.ts.length) {
      _.each (score.ts, function (hits) {
        cs.a   += ((hits >>  0) & 0x0f);
        cs.b   += ((hits >>  4) & 0x0f);
        cs.c   += ((hits >>  8) & 0x0f);
        cs.d   += ((hits >> 12) & 0x0f);
        cs.ns  += ((hits >> 16) & 0x0f);
        cs.m   += ((hits >> 20) & 0x0f);
        cs.npm += ((hits >> 24) & 0x0f);
      });
    }

    cs.paperp = (cs.a * 5) + (cs.b * bcPoints) + (cs.c * bcPoints) + (cs.d * dPoints);
    cs.steelp = (cs.sh * 5);
    cs.points = cs.steelp + cs.paperp;

    cs.procp = (cs.p * 10) + cs.ap;
    cs.mp = cs.m * 10;
    cs.smp = cs.sm * 10;
    cs.nsp = cs.ns * 10;
    cs.penalty = cs.procp + cs.smp + cs.mp + cs.nsp;

    cs.total = _.max ([cs.points - cs.penalty, 0]);
    cs.hf = (stage.stage_scoretype === 'Fixed') ? cs.total : (cs.time ? (cs.total / cs.time) : 0);

    cs.time2 = cs.time.toFixed (2);
    cs.hf4 = cs.hf.toFixed (4);

    return cs;
  };

  //
  //  Maps a keypress directly to a division display
  //
  my.kioskKeys = function () {
    $(document).keydown (function (e) {
      switch (String.fromCharCode (e.keyCode)) {
        case 'l' : window.location.href = '/kiosk/scores?kiosk=1&stage=overall&division=LTD';    e.preventDefault (); break;
        case 'L' : window.location.href = '/kiosk/scores?kiosk=1&stage=overall&division=LTDTEN'; e.preventDefault (); break;
        case 'o' : window.location.href = '/kiosk/scores?kiosk=1&stage=overall&division=OPEN';   e.preventDefault (); break;
        case 'p' : window.location.href = '/kiosk/scores?kiosk=1&stage=overall&division=PROD';   e.preventDefault (); break;
        case 'r' : window.location.href = '/kiosk/scores?kiosk=1&stage=overall&division=REV';    e.preventDefault (); break;
        case 's' : window.location.href = '/kiosk/scores?kiosk=1&stage=overall&division=SS';     e.preventDefault (); break;
        case 'c' : window.location.href = '/kiosk/scores?kiosk=1&stage=overall&division=CO';     e.preventDefault (); break;
        default  : break;
      }
    });
  };

  return my;
}(pmelib || {}));
