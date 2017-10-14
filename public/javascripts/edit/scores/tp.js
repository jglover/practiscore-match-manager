/* global io, History, pmelib */
/* global console:false, _:false */
/* jshint eqnull:true */

$(function () {
  'use strict';

  var App = {};

  //
  //  Run through all the stages and shooters, calculating the scores for any
  //  scores that exist. Deleted shooters should already be removed, DQed
  //  shooters and DNFs return all 0's.
  //
  App.calculateScores = function (matchData) {
    var matchScoresByStageByTime = [];
    var matchScoresOverallByTime = {};
    var matchScoresByStageByPoints = [];
    var matchScoresOverallByPoints = {};
    var bons = matchData.m.match_bonuses || [];
    var pens = matchData.m.match_penalties || [];

    _.each (matchData.m.match_shooters, function (shooter) {
      shooter.noscore = 0;
      shooter.rtime = 0;
      shooter.ptime = 0;
      shooter.btime = 0;
      shooter.ftime = 0;
      shooter.time = {};
      shooter.time.overallTotal = 0;
      shooter.time.overallPlace = 0;
      shooter.time.overallPlaceOf = 0;
      shooter.time.divisionTotal = 0;
      shooter.time.divisionPlace = 0;
      shooter.time.divisionPlaceOf = 0;
      shooter.points = {};
      shooter.points.overallTotal = 0;
      shooter.points.overallPlace = 0;
      shooter.points.overallPlaceOf = 0;
      shooter.points.divisionTotal = 0;
      shooter.points.divisionPlace = 0;
      shooter.points.divisionPlaceOf = 0;
    });

    //
    //  Calculate stage scores
    //
    _.each (matchData.s.match_scores, function (stageScores, stageIndex) {
      var stage = App.quickFind.s [stageScores.stage_uuid];

      matchScoresByStageByTime [stageIndex] = {};

      _.each (stageScores.stage_stagescores, function (score) {
        matchScoresByStageByTime [stageIndex][score.shtr] = pmelib.calculateScore (bons, pens, stage, score, App.quickFind.c [score.shtr]);
      });

      if (_.size (matchScoresByStageByTime [stageIndex])) {
        var lowestOverallTime = 0;
        var lowestDivisionTime = {};
        var divisionPlaceTime = {};
        var divisionPlacePoints = {};

        matchScoresByStageByTime [stageIndex] = _.sortBy (matchScoresByStageByTime [stageIndex], function (score) {
          return (score.noscore > 0) ? score.noscore : score.ftime;
        });

        _.each (matchScoresByStageByTime [stageIndex], function (score, scoreIndex) {
          var shooter = App.quickFind.c [score.shooter];

          lowestOverallTime = lowestOverallTime || score.ftime;
          lowestDivisionTime [score.div] = lowestDivisionTime [score.div] || score.ftime;
          divisionPlaceTime [score.div] = divisionPlaceTime [score.div] || 0;
          score.time.divisionPlace = ++divisionPlaceTime [score.div];
          score.time.overallPlace = scoreIndex + 1;
          score.time.overallPlaceOf = matchScoresByStageByTime [stageIndex].length;

          if (lowestOverallTime) {
            score.time.overallTotal = score.ftime;
            score.points.overallPercent = (Math.round (lowestOverallTime * 10000) / 10000) / (Math.round (score.time.overallTotal * 10000) / 10000);
            score.points.overallTotal = Math.round (((stage.stage_points || 100) * score.points.overallPercent) * 10000) / 10000;
            shooter.time.overallTotal += score.time.overallTotal;
            shooter.points.overallTotal += score.points.overallTotal;
          }
          if (lowestDivisionTime [score.div]) {
            score.points.divisionPercent = (Math.round (lowestDivisionTime [score.div] * 10000) / 10000) / (Math.round (score.time.overallTotal * 10000) / 10000);
            score.points.divisionTotal = Math.round (((stage.stage_points || 100) * score.points.divisionPercent) * 10000) / 10000;
            shooter.points.divisionTotal += score.points.divisionTotal;
          }

          shooter.noscore += score.noscore;
          shooter.rtime   += score.rtime;
          shooter.ptime   += score.ptime;
          shooter.btime   += score.btime;
          shooter.ftime   += score.ftime;
        });

        _.each (matchScoresByStageByTime [stageIndex], function (score) {
          score.time.divisionPlaceOf = divisionPlaceTime [score.div];
        });

        //
        //
        //
        matchScoresByStageByPoints [stageIndex] = _.sortBy (matchScoresByStageByTime [stageIndex], function (score) {
          return (score.noscore > 0) ? (-1 * score.noscore) : score.points.overallTotal;
        }).reverse ();

        _.each (matchScoresByStageByPoints [stageIndex], function (score, scoreIndex) {
          divisionPlacePoints [score.div] = divisionPlacePoints [score.div] || 0;
          score.points.divisionPlace = ++divisionPlacePoints [score.div];
          score.points.overallPlace = scoreIndex + 1;
          score.points.overallPlaceOf = matchScoresByStageByPoints [stageIndex].length;
        });

        _.each (matchScoresByStageByPoints [stageIndex], function (score) {
          score.points.divisionPlaceOf = divisionPlacePoints [score.div];
        });
      }
    });

    //
    //  Calculate overall combined scores
    //
    {
      var highestPoints = 0;

      matchScoresOverallByTime.combined = _.sortBy (matchData.m.match_shooters, function (shooter) {
        return (shooter.noscore > 0) ? shooter.noscore : shooter.time.overallTotal;
      });

      _.each (matchScoresOverallByTime.combined, function (shooter, shooterIndex) {
        shooter.time.overallPlace = shooterIndex + 1;
        shooter.time.overallPlaceOf = matchScoresOverallByTime.combined.length;
      });

      matchScoresOverallByPoints.combined = _.sortBy (matchScoresOverallByTime.combined, function (shooter) {
        return (shooter.noscore > 0) ? (-1 * shooter.noscore) : shooter.points.overallTotal;
      }).reverse ();

      _.each (matchScoresOverallByPoints.combined, function (shooter, shooterIndex) {
        shooter.points.overallPlace = shooterIndex + 1;
        shooter.points.overallPlaceOf = matchScoresOverallByPoints.combined.length;
        highestPoints = highestPoints || shooter.points.overallTotal;

        if (highestPoints)
          shooter.points.overallPercent = shooter.points.overallTotal / highestPoints;
      });
    }

    //
    //  Calculate overall by division scores
    //
    {
      _.each (App.matchDivisions, function (d) {
        var highestPoints;

        matchScoresOverallByTime [d] = _.sortBy (_.filter (matchData.m.match_shooters, 'sh_dvp', d), function (shooter) {
          return (shooter.noscore > 0) ? shooter.noscore : shooter.time.overallTotal;
        });

        _.each (matchScoresOverallByTime [d], function (shooter, shooterIndex) {
          shooter.time.divisionPlace = shooterIndex + 1;
          shooter.time.divisionPlaceOf = matchScoresOverallByTime [d].length;
        });

        matchScoresOverallByPoints [d] = _.sortBy (matchScoresOverallByTime [d], function (shooter) {
          return (shooter.noscore > 0) ? (-1 * shooter.noscore) : shooter.points.divisionTotal;
        }).reverse ();

        _.each (matchScoresOverallByPoints [d], function (shooter, shooterIndex) {
          shooter.points.divisionPlace = shooterIndex + 1;
          shooter.points.divisionPlaceOf = matchScoresOverallByPoints [d].length;
          highestPoints = highestPoints || shooter.points.divisionTotal;

          if (highestPoints)
            shooter.points.divisionPercent = shooter.points.divisionTotal / highestPoints;
        });
      });
    }

    //
    //  Final fixup to make points and percents fixed place. No need to fixup
    //  matchSoresByStageByPoints and matchSoresOverallByPoints as they're just
    //  references to matchScoresByStageByTime and matchScoresOverallByTime.
    //
    var fixup = function (scoreOrShooter) {
      _.each (['time', 'points'], function (i) {
        var item = scoreOrShooter [i];

        item.overallTotal4    = ((item.overallTotal    || 0) * 1).toFixed (4);
        item.overallPercent2  = ((item.overallPercent  || 0) * 100).toFixed (2);
        item.divisionTotal4   = ((item.divisionTotal   || 0) * 1).toFixed (4);
        item.divisionPercent2 = ((item.divisionPercent || 0) * 100).toFixed (2);
      });
    };

    _.each (matchData.s.match_scores, function (stageScores, stageIndex) {
      _.each (matchScoresByStageByTime [stageIndex], function (score) {
        fixup (score);
      });
      _.each (matchScoresOverallByTime, function (division) {
        _.each (division, function (shooter) {
          fixup (shooter);
          shooter.rtime2 = shooter.rtime.toFixed (2);
          shooter.ptime2 = shooter.ptime.toFixed (2);
          shooter.btime2 = shooter.btime.toFixed (2);
          shooter.ftime2 = shooter.ftime.toFixed (2);
        });
      });
    });

    return {time:
              {
                matchScoresByStage: matchScoresByStageByTime,
                matchScoresOverall: matchScoresOverallByTime,
              },
            points:
              {
                matchScoresByStage: matchScoresByStageByPoints,
                matchScoresOverall: matchScoresOverallByPoints,
              },
           };
  };

  //
  //
  //
  function newTD (tr, options) {
    var td;

    if ((options.points && (App.mode !== 'points')) || (options.time && (App.mode !== 'time')))
      return;

    td = document.createElement ('td');

    if (!_.isUndefined (options.text))
      td.innerHTML = options.noescape ? options.text : _.escape (options.text);

    if (!_.isUndefined (options.cn))
      td.className = options.cn;

    if (options.id)
      td.id = options.id;

    tr.appendChild (td);
  }

  App.addPenaltyPopups  = function (scores) {
    $('[id^="pen_"]').each (function () {
      var penId = '#' + $(this).attr ('id');
      var scoreIndex = penId.substr (5);
      var score = scores [scoreIndex];
      var stage = App.quickFind.s [score.stage];
      var shooter = App.quickFind.c [score.shooter];
      var matchPens = App.matchData.m.match_penalties;

      $(this).addClass ('tablesorter-force-link');

      $(penId).off ().click (function (e) {
        var tableRows = '';

        e.preventDefault ();

        _.each (score.pens, function (count, index) {
          if (count) {
            tableRows = tableRows +
              '<tr>' +
                '<td class="popup-content-table-penalty">' + matchPens [index].pen_name + '</td>' +
                '<td class="popup-content-table-time">'    + matchPens [index].pen_val.toFixed (2) + '</td>' +
                '<td class="popup-content-table-count">'   + count + '</td>' +
                '<td class="popup-content-table-total">'   + Number (count * matchPens [index].pen_val).toFixed (2) + '</td>' +
              '</tr>';
          }
        });

        tableRows = tableRows +
          '<tr>' +
            '<td style="border-left-style: none; border-bottom-style: none; border-right-style: none"></td>' +
            '<td style="border-left-style: none; border-bottom-style: none; border-right-style: none"></td>' +
            '<td style="border-left-style: none; border-bottom-style: none;"></td>' +
            '<td>' + score.ptime2 + '</td>' +
          '</tr>';

        $('#popup-content-table > tbody').empty ();
        $('#popup-content-table tbody').append (tableRows);
        $('#popup').dialog ({
          width: 'auto',
          title: _.escape (shooter.sh_fn + ' ' + shooter.sh_ln + ' -- ' + stage.stage_name),
          dialogClass: "no-close",
          modal: true,
          draggable: true,
          resizable: false,
          buttons: {
            'Close': function () {
              $(this).dialog ('close');
            },
          },
        });
      });
    });
  };

  App.addBonusPopups = function (scores) {
    $('[id^="bon_"]').each (function () {
      var bonId = '#' + $(this).attr ('id');
      var scoreIndex = bonId.substr (5);
      var score = scores [scoreIndex];
      var stage = App.quickFind.s [score.stage];
      var shooter = App.quickFind.c [score.shooter];
      var matchBons = App.matchData.m.match_bonuses;

      $(this).addClass ('tablesorter-force-link');

      $(bonId).off ().click (function (e) {
        var tableRows = '';

        e.preventDefault ();

        _.each (score.bons, function (count, index) {
          if (count) {
            tableRows = tableRows +
              '<tr>' +
                '<td class="popup-content-table-bonus">' + matchBons [index].bon_name + '</td>' +
                '<td class="popup-content-table-time">'  + matchBons [index].bon_val.toFixed (2) + '</td>' +
                '<td class="popup-content-table-count">' + count + '</td>' +
                '<td class="popup-content-table-total">' + Number (count * matchBons [index].bon_val).toFixed (2) + '</td>' +
              '</tr>';
          }
        });

        tableRows = tableRows +
          '<tr>' +
            '<td style="border-left-style: none; border-bottom-style: none; border-right-style: none"></td>' +
            '<td style="border-left-style: none; border-bottom-style: none; border-right-style: none"></td>' +
            '<td style="border-left-style: none; border-bottom-style: none;"></td>' +
            '<td class="popup-content-table-total">' + score.btime2 + '</td>' +
          '</tr>';

        $('#popup-content-table > tbody').empty ();
        $('#popup-content-table tbody').append (tableRows);
        $('#popup').dialog ({
          width: 'auto',
          title: _.escape (shooter.sh_fn + ' ' + shooter.sh_ln + ' -- ' + stage.stage_name),
          dialogClass: "no-close",
          modal: true,
          draggable: true,
          resizable: false,
          buttons: {
            'Close': function () {
              $(this).dialog ('close');
            },
          },
        });
      });
    });
  };

  //
  //
  //
  App.addModeButton = function (callback) {
    $('#buttonMode').off ().click (function (event) {
      event.preventDefault ();
      $(this).blur ();
      $("span", this).text ('View As Time Plus' + (App.mode === 'time' ? '' : ' w/ Points'));
      App.mode = (App.mode === 'time' ? 'points' : 'time');
      if (callback)
        callback (this);
    });
    $('#buttonMode span').text ('View As Time Plus' + (App.mode === 'time' ? ' w/ Points' : ''));
    $('#mode').show ();
  };

  //
  //  Combined overall is calculated by summing the stage points of all the
  //  stages, with the highest combined points being the 'reference', and each
  //  shooters match percentage being thier total points divided by the
  //  reference value.
  //
  //  FIXME: This needs to display all stages like https://practiscore.com/results.php?uuid=50b89382-93f1-4946-8305-40eccb99cfe4&page=matchCombined
  //
  App.displayOverall = function (divisionName, sortedShooters) {
    var fragment = document.createDocumentFragment ();
    var p = document.createElement ('p');
    var span = document.createElement ('span');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr;
    var bestTime = 0;

    span.innerHTML = 'Overall -- ' + divisionName;
    span.className = 'useInZoom';

    p.appendChild (span);
    p.id = 'combinedTop';

    tr = document.createElement ('tr');

    _.each ([
              {t:'Place', c:'col-place'},
              {t:'Name', c:'col-name'},
              {t:'No.', c:'col-no'},
              {t:'Class', c:'col-class'},
              {t:'Division', c:'col-division'},
              {t:'Raw Time', c:'col-rawtime'},
              {t:'Penalties', c:'col-penalties'},
              {t:'Bonuses', c:'col-bonuses'},
              {t:'Final Time', c:'col-finaltime'},
              {t:'Diff', c:'col-diff'},
              {t:'Points', points:true, c:'col-points'},
              {t:'Percent', points:true, c:'col-percent'}
            ], function (h) {
      if ((h.points && (App.mode !== 'points')) || (h.time && (App.mode !== 'time')))
        return;

      var th = document.createElement ('th');
      th.innerHTML = h.t;
      th.className = h.c;
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    var pointsKey  = (divisionName === 'Combined') ? 'overallTotal4' : 'divisionTotal4';
    var percentKey = (divisionName === 'Combined') ? 'overallPercent2' : 'divisionPercent2';

    _.each (sortedShooters, function (shooter, shooterIndex) {
      tr = document.createElement ('tr');
      var diffTime = !shooterIndex ? 0 : shooter.ftime - bestTime;

      newTD (tr, {cn: 'combinedPlace',     text: shooterIndex + 1});
      newTD (tr, {cn: 'combinedName',      text: shooter.sh_ln + ', ' + shooter.sh_fn + (shooter.sh_dq ? ' (DQ)' : '')});
      newTD (tr, {cn: 'combinedNo',        text: shooter.sh_num});
      newTD (tr, {cn: 'combinedClass',     text: shooter.sh_grd});
      newTD (tr, {cn: 'combinedDivision',  text: shooter.sh_dvp});
      newTD (tr, {cn: 'combinedRawTime',   text: shooter.noscore ? '--' : shooter.rtime2});
      newTD (tr, {cn: 'combinedPenalties', text: shooter.noscore ? '--' : shooter.ptime2});
      newTD (tr, {cn: 'combinedBonuses',   text: shooter.noscore ? '--' : shooter.btime2});
      newTD (tr, {cn: 'combinedTime',      text: shooter.noscore ? '--' : shooter.ftime2});
      newTD (tr, {cn: 'combinedDiff',      text: shooter.noscore ? '--' : diffTime.toFixed (2)});
      newTD (tr, {cn: 'combinedMatchPts',  text: shooter.noscore ? '--' : shooter.points [pointsKey],  points: true});
      newTD (tr, {cn: 'combinedMatchPct',  text: shooter.noscore ? '--' : shooter.points [percentKey], points: true});

      tbody.appendChild (tr);

      if (!bestTime)
        bestTime = shooter.ftime;
    });

    table.id = 'combinedTable';
    table.appendChild (thead);
    table.appendChild (tbody);

    fragment.appendChild (p);
    fragment.appendChild (table);

    $('#scores').empty ().append (fragment).show ();

    $('#combinedTable th').attr ('data-placeholder', '[All]');
    $('#combinedTable').tablesorter (
    {
      theme: 'jui',
      sortReset: true,
      sortRestart: true,
      fixedWidth: false,
      headerTemplate: '{content} {icon}',
      sortList: [
        [0,0]
      ],
      headers: {
        0: {sortInitialOrder: 'asc' },
      },
      emptyTo: 'none',
      widgets: ['saveSort', 'filter', 'uitheme', 'zebra'],
      widgetOptions: {
        zebra: ['even', 'odd'],
        saveSort: true,
        filter_hideFilters: true,
        filter_functions: {
          '.col-class': true,
          '.col-division': true,
        },
      },
    });

    return 0;
  };

  App.displayOverallCombined = function () {
    return App.displayOverall ('Combined', App.scores [App.mode].matchScoresOverall.combined);
  };

  App.displayOverallDivision = function (divisionNo) {
    return App.displayOverall (App.matchDivisions [divisionNo], App.scores [App.mode].matchScoresOverall [App.matchDivisions [divisionNo]]);
  };

  //
  //
  //
  App.displayStageReview = function (stageNo) {
    var stage = App.matchData.m.match_stages [stageNo];
    var qf = App.quickFind;
    var fragment = document.createDocumentFragment ();
    var p = document.createElement ('p');
    var span = document.createElement ('span');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr;

    var sortedScores = _.sortBy (App.scores [App.mode].matchScoresByStage [stageNo], function (score) {
      var shooter = qf.c [score.shooter];
      return shooter.sh_ln + ', ' + shooter.sh_fn;
    });

    span.innerHTML = _.escape (stage.stage_name + ' -- Review');
    span.className = 'useInZoom';

    p.appendChild (span);
    p.id = 'reviewTop';
    fragment.appendChild (p);

    tr = document.createElement ('tr');

    _.each ([
              {t:'Name', c:'col-name'},
              {t:'No.', c:'col-no'},
              {t:'Squad', c:'col-squad'},
              {t:'Class', c:'col-class'},
              {t:'Division', c:'col-division'},
              {t:'Raw Time', c:'col-rawtime'},
              {t:'Penalties', c:'col-penalties'},
              {t:'Bonuses', c:'col-bonuses'},
              {t:'Final Time', c:'col-finaltime'},
              {t:'Points', c:'col-points', points: true},
              {t:'DNF', c:'col-dnf'},
              {t:'DQ', c:'col-dnf'}
            ], function (h) {
      if ((h.points && (App.mode !== 'points')) || (h.time && (App.mode !== 'time')))
        return;

      var th = document.createElement ('th');
      th.innerHTML = h.t;
      th.className = h.c;
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    _.each (sortedScores, function (score, scoreIndex) {
      var shooter = qf.c [score.shooter];
      var noscore = score.noscore && !score.rtime;
      var rtime2 = noscore ? '--' : score.rtime2;
      var ptime2 = noscore ? '--' : score.ptime2;
      var btime2 = noscore ? '--' : score.btime2;
      var ftime2 = noscore ? '--' : score.ftime2;
      var points = noscore ? '--' : score.points.divisionTotal4;

      tr = document.createElement ('tr');

      newTD (tr, {cn: 'reviewName',      text: shooter.sh_ln + ', ' + shooter.sh_fn + (score.dq ? ' (DQ)' : '') + (score.dnf ? ' (DNF)' : '')});
      newTD (tr, {cn: 'reviewNo',        text: shooter.sh_num});
      newTD (tr, {cn: 'reviewSquad',     text: shooter.sh_sqd || ''});
      newTD (tr, {cn: 'reviewClass',     text: shooter.sh_grd});
      newTD (tr, {cn: 'reviewDivision',  text: shooter.sh_dvp});
      newTD (tr, {cn: 'reviewRawTime',   text: rtime2});
      newTD (tr, {cn: 'reviewPenalties', text: ptime2, id: score.ptime ? ('pen_' + scoreIndex) : null});
      newTD (tr, {cn: 'reviewBonuses',   text: btime2, id: score.btime ? ('bon_' + scoreIndex) : null});
      newTD (tr, {cn: 'reviewTime',      text: ftime2});
      newTD (tr, {cn: 'reviewStagePts',  text: points, points: true});
      newTD (tr, {cn: 'reviewDNF',       text: score.dnf ? 'Y' : ''});
      newTD (tr, {cn: 'reviewDQ',        text: score.dq  ? 'Y' : ''});

      tbody.appendChild (tr);
    });

    table.id = 'reviewTable';
    table.className = 'useInZoom';
    table.appendChild (thead);
    table.appendChild (tbody);
    fragment.appendChild (table);

    $('#scores').empty ().append (fragment);
    App.addPenaltyPopups (sortedScores);
    App.addBonusPopups (sortedScores);
    $('#scores').show ();

    $('#reviewTable th').attr ('data-placeholder', '[All]');
    $('#reviewTable').tablesorter (
    {
      theme: 'jui',
      sortReset: true,
      sortRestart: true,
      fixedWidth: false,
      headerTemplate: '{content} {icon}',
      sortList: [
        [0, 0]
      ],
      headers: {
        0: {sortInitialOrder: 'asc' },
      },
      emptyTo: 'none',
      widgets: ['saveSort', 'filter', 'uitheme', 'zebra'],
      widgetOptions: {
        zebra: ['even', 'odd'],
        saveSort: true,
        filter_hideFilters: true,
        filter_functions: {
           '.col-squad': true,
           '.col-class': true,
           '.col-division': true,
           '.col-dnf': {
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
          '.col-dq': {
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
        },
      },
    });

    return 0;
  };

  //
  //
  //
  App.displayStage = function (divisionName, stageNo, sortedScores) {
    var stages = App.matchData.m.match_stages;
    var qf = App.quickFind;
    var fragment = document.createDocumentFragment ();
    var p = document.createElement ('p');
    var span = document.createElement ('span');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr;
    var bestTime = 0;

    span.innerHTML = _.escape (stages [stageNo].stage_name + ' -- ' + divisionName);
    span.className = 'useInZoom';

    p.appendChild (span);
    p.id = 'scoresTop';
    fragment.appendChild (p);

    tr = document.createElement ('tr');

    _.each ([
              {t:'Place', c:'col-place'},
              {t:'Name', c:'col-name'},
              {t:'No.', c:'col-no'},
              {t:'Class', c:'col-class'},
              {t:'Division', c:'col-division'},
              {t:'Raw Time', c:'col-rawtime'},
              {t:'Penalties', c:'col-penalties'},
              {t:'Bonuses', c:'col-bonuses'},
              {t:'Final Time', c:'col-finaltime'},
              {t:'Diff', c:'col-diff'},
              {t:'Points', points:true, c:'col-points'},
              {t:'Percent', points:true, c:'col-percent'}
            ], function (h) {
      if ((h.points && (App.mode !== 'points')) || (h.time && (App.mode !== 'time')))
        return;

      var th = document.createElement ('th');
      th.innerHTML = h.t;
      th.className = h.c;
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    var pointsKey  = (divisionName === 'Combined') ? 'overallTotal4' : 'divisionTotal4';
    var percentKey = (divisionName === 'Combined') ? 'overallPercent2' : 'divisionPercent2';

    _.each (sortedScores, function (score, scoreIndex) {
      var shooter = qf.c [score.shooter];
      var rtime2 = (score.noscore && !score.rtime) ? '--' : score.rtime2;
      var ptime2 = (score.noscore && !score.rtime) ? '--' : score.ptime2;
      var btime2 = (score.noscore && !score.rtime) ? '--' : score.btime2;
      var ftime2 = (score.noscore && !score.rtime) ? '--' : score.ftime2;
      var diffTime = !scoreIndex ? 0 : score.ftime - bestTime;

      tr = document.createElement ('tr');

      newTD (tr, {cn: 'scoresPlace',     text: scoreIndex + 1});
      newTD (tr, {cn: 'scoresName',      text: shooter.sh_ln + ', ' + shooter.sh_fn + (shooter.sh_dq ? ' (DQ)' : '')});
      newTD (tr, {cn: 'scoresNo',        text: shooter.sh_num});
      newTD (tr, {cn: 'scoresClass',     text: shooter.sh_grd});
      newTD (tr, {cn: 'scoresDivision',  text: shooter.sh_dvp});
      newTD (tr, {cn: 'scoresRawTime',   text: rtime2});
      newTD (tr, {cn: 'scoresPenalties', text: ptime2, id: score.ptime ? ('pen_' + scoreIndex) : null});
      newTD (tr, {cn: 'scoresBonuses',   text: btime2, id: score.btime ? ('bon_' + scoreIndex) : null});
      newTD (tr, {cn: 'scoresTime',      text: ftime2});
      newTD (tr, {cn: 'scoresDiff',      text: score.noscore ? '--' : diffTime.toFixed (2)});
      newTD (tr, {cn: 'scoresStagePts',  text: score.noscore ? '--' : score.points [pointsKey],  points: true});
      newTD (tr, {cn: 'scoresStagePct',  text: score.noscore ? '--' : score.points [percentKey], points: true});

      tbody.appendChild (tr);

      if (!bestTime)
        bestTime = score.ftime;
    });

    table.id = 'scoresTable';
    table.className = 'useInZoom';
    table.appendChild (thead);
    table.appendChild (tbody);
    fragment.appendChild (table);

    $('#scores').empty ().append (fragment);
    App.addPenaltyPopups (sortedScores);
    App.addBonusPopups (sortedScores);
    $('#scores').show ();

    $('#scoresTable th').attr ('data-placeholder', '[All]');
    $('#scoresTable').tablesorter (
    {
      theme: 'jui',
      sortReset: true,
      sortRestart: true,
      fixedWidth: false,
      headerTemplate: '{content} {icon}',
      sortList: [
        [0, 0]
      ],
      headers: {
        0: {sortInitialOrder: 'asc'},
      },
      emptyTo: 'none',
      widgets: ['saveSort', 'filter', 'uitheme', 'zebra'],
      widgetOptions: {
        zebra: ['even', 'odd'],
        saveSort: true,
        filter_hideFilters: true,
        filter_functions: {
          '.col-class': true,
          '.col-division': true,
        },
      },
    });

    return 0;
  };

  App.displayStageCombined = function (stageNo) {
    return App.displayStage ('Combined', stageNo, App.scores [App.mode].matchScoresByStage [stageNo]);
  };

  App.displayStageDivision = function (stageNo, divisionNo) {
    var divisionScores = _.filter (App.scores [App.mode].matchScoresByStage [stageNo], 'div', App.matchDivisions [divisionNo]);

    return App.displayStage (App.matchDivisions [divisionNo], stageNo, divisionScores);
  };

  //
  //  Determine which display to use, based on the stage number, type and
  //  division. Stage 0 is the combined results for all stages, while actual
  //  stages are 1..n. 'type' indicates if the scores are combined, by
  //  division, or review (raw scores displayed)
  //
  App.displayResults = function (stageNo, type, divisionNo) {
    var r = -1;

    if (divisionNo < App.matchDivisions.length) {
      if (stageNo === 0) {
        if (type === 'c')
          r = App.displayOverallCombined ();
        else if (type === 'd')
          r = App.displayOverallDivision (divisionNo);
      } else if (stageNo <= App.matchData.m.match_stages.length) {
        if (type === 'r')
          r = App.displayStageReview (stageNo - 1);
        else if (type === 'c')
          r = App.displayStageCombined (stageNo - 1);
        else if (type === 'd')
          r = App.displayStageDivision (stageNo - 1, divisionNo);
      }
    }

    return r;
  };

  //
  //  Display the menu with all the stage names and divisions.
  //
  App.displayMenuStagesAndDivisions = function () {
    var stages = App.matchData.m.match_stages;
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;

    tr = document.createElement ('tr');

    _.each (['Stage', 'Review', 'Combined'], function (f) {
      th = document.createElement ('th');
      th.innerHTML = f;
      th.className = 'sorter-false';
      th.style.textAlign = 'center';
      tr.appendChild (th);
    });

    _.each (App.matchDivisions, function (d) {
      th = document.createElement ('th');
      th.innerHTML = _.escape (d);
      th.className = 'sorter-false';
      th.style.textAlign = 'center';
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    //
    //
    //
    function makeTD (tr, html, id) {
      td = document.createElement ('td');
      td.innerHTML = _.escape (html);

      if (id) {
        td.id = id;
        td.className = 'tablesorter-force-link';
      }

      tr.appendChild (td);
    }

    tr = document.createElement ('tr');
    makeTD (tr, '');
    makeTD (tr, '');
    makeTD (tr, 'Combined', 's_s0_c0');

    _.each (App.matchDivisions, function (d, divisionIndex) {
      makeTD (tr, d, 's_s0_d' + divisionIndex);
    });

    tbody.appendChild (tr);

    _.each (stages, function (s, stageIndex) {
      tr = document.createElement ('tr');
      makeTD (tr, s.stage_name);
      makeTD (tr, 'Review', 's_s' + (stageIndex + 1) + '_r0');
      makeTD (tr, 'Combined', 's_s' + (stageIndex + 1) + '_c0');

      _.each (App.matchDivisions, function (d, divisionIndex) {
        makeTD (tr, d, 's_s' + (stageIndex + 1) + '_d' + divisionIndex);
      });

      tbody.appendChild (tr);
    });

    table.id = 'menuTable';
    table.className = 'useInZoom';
    table.appendChild (thead);
    table.appendChild (tbody);

    return table;
  };

  App.displayIndividualResultsMenu = function () {
    var fragment = document.createDocumentFragment ();
    var p;
    var span;

    p = document.createElement ('p');
    fragment.appendChild (p);

    var s = document.createElement ('select');
    var o = document.createElement ('option');
    o.innerHTML = '---';
    s.appendChild (o);
    s.id = 'individualSelect';

    _.each (_.sortBy (App.matchData.m.match_shooters, function (shooter) {
      return shooter.sh_ln + ', ' + shooter.sh_fn;
    }), function (shooter) {
      o = document.createElement ('option');
      o.innerHTML = _.escape (shooter.sh_ln + ', ' + shooter.sh_fn + (shooter.sh_id ? (' (' + shooter.sh_id + ')') : ''));
      o.value = shooter.sh_uid;
      s.appendChild (o);
    });

    span = document.createElement ('span');
    span.innerHTML = 'Display detailed results for ';
    span.id = 'individualDropdownSpan';
    span.className = 'useInZoom';
    span.appendChild (s);

    p = document.createElement ('p');
    p.id = 'individualDropdown';
    p.appendChild (span);

    fragment.appendChild (p);

    return fragment;
  };

  App.sumScores = function (o, n) {
    var r = {};

    if (!o)
      r = n;
    else {
      _.each (_.keys (n), function (k) {
        if (_.isNumber (n [k]))
          r [k] = n [k] + (o [k] || 0);
        else if (_.isPlainObject (n [k])) {
          if (!o [k])
            r [k] = n [k];
          else {
            r [k] = r [k] || {};

            _.each (_.keys (n [k]), function (l) {
              if (_.isNumber (n [k][l])) {
                r [k][l] = n [k][l] + (o [k][l] || 0);
              }
            });
          }
        }
      });

      r.rtime2 = r.rtime.toFixed (2);
      r.ptime2 = r.ptime.toFixed (2);
      r.btime2 = r.btime.toFixed (2);
      r.ftime2 = r.ftime.toFixed (2);
    }

    return r;
  };

  //
  //
  //
  App.displayIndividualResultsHeader = function () {
    var fragment = document.createDocumentFragment ();
    var h1 = document.createElement ('tr');
    var h2 = document.createElement ('tr');
    var th;

    _.each ([
              {t:'', c:1},
              {t:'Score', c:4},
              {t:'Points', c:2, points:true},
              {t:'Place', c:2, time:true},
              {t:'Place (Points)', c:2, points:true}
            ], function (h) {
      if ((h.points && (App.mode !== 'points')) || (h.time && (App.mode !== 'time')))
        return;

      th = document.createElement ('th');
      th.innerHTML = h.t;
      th.setAttribute ('colspan', h.c, 0);
      th.setAttribute ('ts-fixme', 1);
      th.className = 'sorter-false';
      th.style.textAlign = 'center';
      h1.appendChild (th);
    });

    _.each ([
              {t:'Stage'},
              {t:'Raw Time'},
              {t:'Penalties'},
              {t:'Bonuses'},
              {t:'Final Time'},
              {t:'Points', points:true},
              {t:'Percent', points: true},
              {t:'Division'},
              {t:'Combined'}
            ], function (f, fIndex) {
      if ((f.points && (App.mode !== 'points')) || (f.time && (App.mode !== 'time')))
        return;

      th = document.createElement ('th');
      th.innerHTML = f.t;

      if (!fIndex) {
        th.className = 'sorter-false';
        th.style.textAlign = 'center';
      }

      h2.appendChild (th);
    });

    fragment.appendChild (h1);
    fragment.appendChild (h2);

    return fragment;
  };

  App.displayIndividualResults = function (shooter_uid) {
    var fragment = document.createDocumentFragment ();
    var shooter;
    var scores = [];
    var p;

    if (!(shooter = App.quickFind.c [shooter_uid])) {
      p = document.createElement ('p');
      p.innerHTML = 'Error! Cannot locate requested competitor';
      p.id = 'individualError';

      fragment.appendChild (p);
    } else {
      var overall = {};
      var table = document.createElement ('table');
      var thead = document.createElement ('thead');
      var tbody = document.createElement ('tbody');
      var tbodyNoSort = document.createElement ('tbody');
      var tr;
      var n = '';

      p = document.createElement ('p');
      n += shooter.sh_ln + ', ' + shooter.sh_fn;
      n += shooter.sh_id ? (' -- ' + shooter.sh_id) : '';
      n += ' -- \'' + shooter.sh_grd + '\' Class';
      n += ' -- ' + shooter.sh_dvp;
      p.innerHTML = _.escape (n);
      p.id = 'individualShooterName';

      thead.appendChild (App.displayIndividualResultsHeader ());

      _.each (App.matchData.m.match_stages, function (stage, stageIndex) {
        var score = _.find (App.scores [App.mode].matchScoresByStage [stageIndex], 'shooter', shooter.sh_uid);
        var noscore = score.noscore && !score.rtime;
        var rtime2  = noscore ? '--' : score.rtime2;
        var ptime2  = noscore ? '--' : score.ptime2;
        var btime2  = noscore ? '--' : score.btime2;
        var ftime2  = noscore ? '--' : score.ftime2;
        var points  = noscore ? '--' : score.points.divisionTotal4;
        var percent = noscore ? '--' : score.points.divisionPercent2;

        tr = document.createElement ('tr');

        newTD (tr, {text: _.escape (stage.stage_name) + (score.dnf ? ' <b>(DNF)</b>' : ''), noescape: true});
        newTD (tr, {text: rtime2});
        newTD (tr, {text: ptime2, id: score.ptime ? ('pen_' + stageIndex) : null});
        newTD (tr, {text: btime2, id: score.btime ? ('bon_' + stageIndex) : null});
        newTD (tr, {text: ftime2});
        newTD (tr, {text: points, points: true});
        newTD (tr, {text: percent, points: true});
        newTD (tr, {text: score [App.mode].divisionPlace + '&nbsp;/&nbsp;' + score [App.mode].divisionPlaceOf, noescape: true});
        newTD (tr, {text: score [App.mode].overallPlace + '&nbsp;/&nbsp;' + score [App.mode].overallPlaceOf,   noescape: true});

        tbody.appendChild (tr);

        scores.push (score);
        overall = App.sumScores (overall, score);
      });

      tr = document.createElement ('tr');

      newTD (tr, {text: 'Overall'});
      newTD (tr, {text: overall.noscore ? '--' : overall.rtime2});
      newTD (tr, {text: overall.noscore ? '--' : overall.ptime2});
      newTD (tr, {text: overall.noscore ? '--' : overall.btime2});
      newTD (tr, {text: overall.noscore ? '--' : overall.ftime2});
      newTD (tr, {text: overall.noscore ? '--' : overall.points.divisionTotal.toFixed (4),  points: true});
      newTD (tr, {text: overall.noscore ? '--' : overall.points.divisionPercent.toFixed(2), points: true});
      newTD (tr, {text: shooter [App.mode].divisionPlace + '&nbsp;/&nbsp;' + shooter [App.mode].divisionPlaceOf, noescape: true});
      newTD (tr, {text: shooter [App.mode].overallPlace + '&nbsp;/&nbsp;' + shooter [App.mode].overallPlaceOf,   noescape: true});

      tbodyNoSort.className = 'cssInfoBlock';
      tbodyNoSort.appendChild (tr);

      table.id = 'individualTable';
      table.className = 'useInZoom';
      table.appendChild (thead);
      table.appendChild (tbody);
      table.appendChild (tbodyNoSort);

      fragment.appendChild (p);
      fragment.appendChild (table);
    }

    $('#scores').empty ().append (fragment).append (App.displayIndividualResultsMenu ());
    App.addPenaltyPopups (scores);
    App.addBonusPopups (scores);
    $('#scores').show ();

    $('#individualTable td:first-child').css ('text-align', 'left');
    $('#individualTable td:not(:first-child)').css ('text-align', 'right');
    $('#individualTable').tablesorter (
    {
      theme: 'jui',
      sortReset: true,
      sortRestart: true,
      fixedWidth: false,
      headerTemplate: '{content} {icon}',
      emptyTo: 'none',
      widgets: ['uitheme', 'zebra'],
      widgetOptions: {
        zebra: ['even', 'odd'],
      },
    })
    .bind ('sortEnd', function () {
      $('[ts-fixme]').attr ('data-column', 99);
      $('[ts-fixme] > div > div > i').removeClass ().addClass ('tablesorter-icon');
    });

    $('[ts-fixme]').attr ('data-column', 99);
    $('[ts-fixme] > div > div > i').removeClass ().addClass ('tablesorter-icon');

    $('#individualSelect').change (function (e) {
      History.pushState ({'detail': e.target.value}, 'PMM - View Scores', '?detail=' + e.target.value);
    });

    return 0;
  };

  App.displayMenu = function () {
    $('#scores').hide ().empty ().append (App.displayMenuStagesAndDivisions ());
    $('#scores').append (App.displayIndividualResultsMenu ()).show ();

    $('.tablesorter-force-link').off ().click (function (e) {
      History.pushState ({'display': e.target.id}, 'PMM - View Scores', '?display=' + e.target.id);
    });

    $('#individualSelect').change (function (e) {
      History.pushState ({'detail': e.target.value}, 'PMM - View Scores', '?detail=' + e.target.value);
    });

    App.addModeButton ();

    $('#menuTable').tablesorter (
    {
      theme: 'jui',
      fixedWidth: false,
      headerTemplate: '{content} {icon}',
      emptyTo: 'none',
      widgets: ['uitheme', 'zebra'],
      widgetOptions: {
        zebra: ['even', 'odd'],
      },
    });

    return 0;
  };

  //
  //
  //
  App.displayPage = function (urlParms) {
    var r = -1;

    urlParms = urlParms || {'menu': true};

    if (urlParms.stage && urlParms.division) {
      urlParms.division = urlParms.division.toUpperCase ();
      urlParms.stage = urlParms.stage.toLowerCase ();

      if (App.gotoMap.byDivision [urlParms.division] && App.gotoMap.byDivision [urlParms.division][urlParms.stage])
        urlParms.display = App.gotoMap.byDivision [urlParms.division][urlParms.stage];
    }

    if (urlParms.display) {
      var clickTarget = /s_s(\d+)_([rcd])(\d+)/.exec (urlParms.display);

      if (clickTarget && (clickTarget.length === 4)) {
        var stageNo = parseInt (clickTarget [1]);
        var type = clickTarget [2];
        var divisionNo = parseInt (clickTarget [3]);

        App.addModeButton (function () {
          App.displayResults (stageNo, type, divisionNo);
        });

        r = App.displayResults (stageNo, type, divisionNo);
      }
    }

    if (urlParms.detail) {
      App.addModeButton (function () {
        App.displayIndividualResults (urlParms.detail);
      });

      r = App.displayIndividualResults (urlParms.detail);
    }

    if ('menu' in urlParms)
      r = App.displayMenu ();

    if (r)
      History.replaceState ({'menu': true}, 'PMM - View Scores', '?menu');

    //
    //  Must .show () first, otherwise zoom won't be calculated correctly. Make
    //  sure current zoom is reset so widths are correct.
    //
    if (App.urlParms.kiosk) {
      var maxWidth = 0;

      $('#content').css ('zoom', 1);
      $('.useInZoom').each (function () {
        maxWidth = _.max ([maxWidth, $(this).width ()]);
      });
      $('#content').css ('zoom', $(window).width () / (maxWidth + 30));
    }
  };

  //
  //
  //
  App.errorMessage = function (msg) {
    var p = document.createElement ('p');
    p.innerHTML = _.escape (msg);
    p.id = 'errorMessage';
    $('#scores').empty ().append (p).show ();
  };

  //
  //
  //
  App.socketConnect = function () {
    App.socket.emit ('match:request', {options: {all: true}});

    $('#serverDisconnect').hide ();
    $('#content,#menu').show ();
  };

  App.socketDisconnect = function () {
    $('#serverDisconnect').show ();
    $('#content,#menu').hide ();
  };

  App.matchDataReceived = function (param) {
    var matchData = param.matchData;

    if (!matchData || !matchData.m || !matchData.m.match_shooters || !matchData.m.match_shooters.length)
      return App.errorMessage ('(No competitors present)');

    if (!matchData || !matchData.m || !matchData.m.match_stages || !matchData.m.match_stages.length)
      return App.errorMessage ('(No stages present)');

    if (!matchData || !matchData.s || !matchData.s.match_scores || !matchData.s.match_scores.length)
      return App.errorMessage ('(No scores present)');

    if (_.isUndefined (App.mode))
      App.mode = (matchData.m.match_type === 'timeplus') ? 'time' : 'points';

    App.matchData = matchData;

    pmelib.removeDeletedShooters (matchData);
    pmelib.removeDeletedStages (matchData);
    App.matchDivisions = pmelib.getMatchDivisions (matchData);
    App.quickFind = pmelib.createQuickFindList (matchData);
    App.scores = App.calculateScores (matchData);
    App.gotoMap = pmelib.createGotoMap (matchData, App.matchDivisions);

    App.displayPage (History.getState ().data || App.urlParms);
  };

  App.matchUpdated = function () {
    App.socket.emit ('match:request', {options: {all: true}});
  };

  App.kioskScores = function (param) {
    if (!param.stage || !param.division)
      return;

    param.division = param.division.toUpperCase ();
    param.stage = param.stage.toLowerCase ();

    if (!App.gotoMap.byDivision [param.division]) {
      console.log ('Division %s doesn\'t exist', param.division);
      return;
    }

    if (!App.gotoMap.byDivision [param.division][param.stage]) {
      console.log ('Stage %s doesn\'t exist for division %s', param.stage, param.division);
      return;
    }

    App.displayPage ({display: App.gotoMap.byDivision [param.division][param.stage]});
  };

  App.kioskPage = function (param) {
    if (!param.url)
      return;

    window.location.href = param.url;
  };

  //
  //  'Main'
  //
  App.urlParms = pmelib.queryString ();

  if (App.urlParms.kiosk) {
    window.pmeModule = window.pmeModule || {name: 'scores'};
    window.pmeModule.enableKiosk = function () {
      App.socket.on ('kiosk_scores', App.kioskScores);
      App.socket.on ('kiosk_page', App.kioskPage);
    };
  }

  $('#buttonMode').button ();

  History.Adapter.bind (window, 'statechange', function () {
    App.displayPage (History.getState ().data);
  });

  $.extend($.tablesorter.themes.jui, {
    table      : 'ui-widget ui-widget-content ui-corner-all',
    caption    : 'ui-widget-content ui-corner-all',
    header     : 'ui-widget-header ui-corner-all ui-state-default',
    footerRow  : '',
    footerCells: '',
    icons      : 'ui-icon',
    sortNone   : 'ui-icon-carat-2-n-s',
    sortAsc    : 'ui-icon-carat-1-n',
    sortDesc   : 'ui-icon-carat-1-s',
    active     : 'ui-state-active',
    hover      : 'ui-state-hover',
    filterRow  : '',
    even       : 'ui-widget-content',
    odd        : 'ui-state-default'
  });

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_data', App.matchDataReceived);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.emit ('log:log', {'msg': 'Edit/View->Scores (TP)'});
});
