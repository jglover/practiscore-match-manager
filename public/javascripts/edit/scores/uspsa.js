/* global io, History, pmelib */
/* global console:false, _:false */
/* jshint eqnull:true */
/* jshint devel:true */

$(function () {
  'use strict';

  var App = {};

  //
  //  Run through all the stages and shooters, calculating the scores for any
  //  scores that exist. Deleted shooters should already be removed, DQed
  //  shooters and DNFs return all 0's.
  //
  App.calculateScores = function (matchData) {
    var matchScoresByStage = [];
    var matchScoresOverall = {};

    _.each (matchData.m.match_shooters, function (shooter) {
      shooter.spts_o = 0;
      shooter.spts_d = 0;
    });

    _.each (matchData.s.match_scores, function (stageScores, stageIndex) {
      var stage = App.quickFind.s [stageScores.stage_uuid];

      matchScoresByStage [stageIndex] = {};

      _.each (stageScores.stage_stagescores, function (score) {
        matchScoresByStage [stageIndex][score.shtr] = pmelib.calculateScore (stage, score, App.quickFind.c [score.shtr]);
      });

      if (stage.stage_scoretype === 'Fixed') {
        matchData.m.match_stages [stageIndex].stage_points = _.max (matchScoresByStage [stageIndex], function (score) {
          return score.hf;
        }).hf;
      }

      //
      //  Calculate overall and division stage points
      //
      if (_.size (matchScoresByStage [stageIndex])) {
        var sortedScores = App.sortScoresByHF (matchScoresByStage [stageIndex]);
        var stagePoints = matchData.m.match_stages [stageIndex].stage_points || 0;
        var sortedScoresLength = sortedScores.length;
        var highHF;
        var highDivHF = {};
        var divPlace = {};

        _.each (sortedScores, function (score, scoreIndex) {
          highHF = highHF || score.hf;
          highDivHF [score.div] = highDivHF [score.div] || score.hf;
          divPlace [score.div] = divPlace [score.div] || 0;
          score.placeDiv = ++divPlace [score.div];
          score.placeOverall = scoreIndex + 1;
          score.placeOverallOf = sortedScoresLength;

          if (highHF) {
            score.spct_o = (Math.round (score.hf * 10000) / 10000) / (Math.round (highHF * 10000) / 10000);
            score.spts_o = Math.round ((stagePoints * score.spct_o) * 10000) / 10000;
            App.quickFind.c [score.shooter].spts_o += score.spts_o;
          }
          if (highDivHF [score.div]) {
            score.spct_d = (Math.round (score.hf * 10000) / 10000) / (Math.round (highDivHF [score.div] * 10000) / 10000);
            score.spts_d = Math.round ((stagePoints * score.spct_d) * 10000) / 10000;
            App.quickFind.c [score.shooter].spts_d += score.spts_d;
          }
        });

        _.each (sortedScores, function (score) {
          score.placeDivOf = divPlace [score.div];
        });
      }
    });

    //
    //  Overall and division stage points calculated, now calculate
    //  percentages. This are used for displaying combined results.
    //
    {
      var highHF;

      matchScoresOverall.combined = _.sortBy (matchData.m.match_shooters, function (shooter) {
        return shooter.sh_dq ? -3.0 : shooter.spts_o;
      }).reverse ();

      var numShooters = matchScoresOverall.combined.length;

      _.each (matchScoresOverall.combined, function (shooter, shooterIndex) {
        shooter.placeOverall = shooterIndex + 1;
        shooter.placeOverallOf = numShooters;
        highHF = highHF || shooter.spts_o;

        if (highHF)
          shooter.spct_o = shooter.spts_o / highHF;
      });
    }

    {
      _.each (App.matchDivisions, function (d) {
        var highHF;

        matchScoresOverall [d] = _.sortBy (_.filter (matchData.m.match_shooters, 'sh_dvp', d), function (shooter) {
          return shooter.sh_dq ? -3.0 : shooter.spts_d;
        }).reverse ();

        var numShooters = matchScoresOverall [d].length;

        _.each (matchScoresOverall [d], function (shooter, shooterIndex) {
          shooter.placeDiv = shooterIndex + 1;
          shooter.placeDivOf = numShooters;
          highHF = highHF || shooter.spts_d;

          if (highHF)
            shooter.spct_d = shooter.spts_d / highHF;
        });
      });
    }

    return {matchScoresByStage: matchScoresByStage, matchScoresOverall: matchScoresOverall};
  };

  //
  //
  //
  App.sortScoresByHF = function (scores) {
    var sortedScores = _.sortBy (scores, function (score) {
      if (score.dq)
        return -3.0;
      if (score.dnf)
        return -2.0;
      if ((score.time === 0.0) && (score.hf === 0.0))
        return -1.0;

      return score.hf;
    });

    return sortedScores.reverse ();
  };

  //
  //
  //
  function newTD (tr, options) {
    var td = document.createElement ('td');

    if (!_.isUndefined (options.text))
      td.innerHTML = options.noescape ? options.text : _.escape (options.text);

    if (!_.isUndefined (options.cn))
      td.className = options.cn;

    if (options.id)
      td.id = options.id;

    tr.appendChild (td);
  }

  //
  //  Combined overall is calculated by summing the stage points of all the
  //  stages, with the highest combined points being the 'reference', and each
  //  shooters match percentage being thier total points divided by the
  //  reference value.
  //
  App.displayOverall = function (divisionName, sortedShooters) {
    var fragment = document.createDocumentFragment ();
    var p = document.createElement ('p');
    var span = document.createElement ('span');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr;

    span.innerHTML = 'Overall -- ' + divisionName;
    span.className = 'useInZoom';

    p.appendChild (span);
    p.id = 'combinedTop';

    tr = document.createElement ('tr');

    _.each (['Place', 'Name', 'USPSA', 'Class', 'Division', 'Age', 'Lady', 'Military', 'Law', 'Foreign', 'Match Pts', 'Match %'], function (h) {
      var th = document.createElement ('th');
      th.innerHTML = h;
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    var pointsKey  = (divisionName === 'Combined') ? 'spts_o' : 'spts_d';
    var percentKey = (divisionName === 'Combined') ? 'spct_o' : 'spct_d';

    _.each (sortedShooters, function (shooter, shooterIndex) {
      tr = document.createElement ('tr');

      newTD (tr, {cn: 'combinedPlace',    text: shooterIndex + 1});
      newTD (tr, {cn: 'combinedName',     text: shooter.sh_ln + ', ' + shooter.sh_fn + (shooter.sh_dq ? ' (DQ)' : '')});
      newTD (tr, {cn: 'combinedUSPSA',    text: shooter.sh_id});
      newTD (tr, {cn: 'combinedClass',    text: App.matchData.l.classes [shooter.sh_grd]});
      newTD (tr, {cn: 'combinedDivision', text: App.matchData.l.divisions [shooter.sh_dvp] + (shooter.sh_pf === 'MAJOR' ? '+' : '-')});
      newTD (tr, {cn: 'combinedAge',      text: App.matchData.l.ages [shooter.sh_age] === 'Adult' ? '' : App.matchData.l.ages [shooter.sh_age]});
      newTD (tr, {cn: 'combinedLady',     text: shooter.sh_gen === 'FEMALE' ? 'Y' : ''});
      newTD (tr, {cn: 'combinedMil',      text: shooter.sh_mil ? 'Y' : ''});
      newTD (tr, {cn: 'combinedLaw',      text: shooter.sh_law ? 'Y' : ''});
      newTD (tr, {cn: 'combinedFor',      text: shooter.sh_frn ? 'Y' : ''});
      newTD (tr, {cn: 'combinedMatchPts', text: shooter [pointsKey].toFixed (4)});
      newTD (tr, {cn: 'combinedMatchPct', text: (shooter [percentKey] * 100).toFixed (2)});

      tbody.appendChild (tr);
    });

    table.id = 'combinedTable';
    table.className = 'useInZoom';
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
          3: true, // Class
          4: true, // Division
          5: { // Age
            'Junior'        : function (e) { return e === 'Junior'; },
            'Adult'         : function (e) { return e === ''; },
            'Senior'        : function (e) { return e === 'Senior'; },
            'Super Senior'  : function (e) { return e === 'Super Senior'; },
          },
          6: { // Female
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
          7: { // Military
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
          8: { // Law
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
          9: { // Foreign
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
        },
      },
    });

    return 0;
  };

  App.displayOverallCombined = function () {
    return App.displayOverall ('Combined', App.scores.matchScoresOverall.combined);
  };

  App.displayOverallDivision = function (divisionNo) {
    return App.displayOverall (App.matchData.l.divisions [App.matchDivisions [divisionNo]], App.scores.matchScoresOverall [App.matchDivisions [divisionNo]]);
  };

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

    var sortedScores = _.sortBy (App.scores.matchScoresByStage [stageNo], function (score) {
      var shooter = qf.c [score.shooter];
      return shooter.sh_ln + ', ' + shooter.sh_fn;
    });

    span.innerHTML = _.escape (stage.stage_name + ' -- Review');
    span.className = 'useInZoom';

    p.appendChild (span);
    p.id = 'reviewTop';
    fragment.appendChild (p);

    tr = document.createElement ('tr');

    _.each (['Name', 'USPSA ', 'Squad', 'Class', 'Division', 'A', 'B', 'C', 'D', 'M', 'NS', 'NPM', 'Proc', 'AP', 'Time', 'HF', 'DNF', 'DQ'], function (h) {
      var th = document.createElement ('th');
      th.innerHTML = h;
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    _.each (sortedScores, function (score) {
      var shooter = qf.c [score.shooter];

      tr = document.createElement ('tr');

      newTD (tr, {cn: 'reviewName',     text: shooter.sh_ln + ', ' + shooter.sh_fn + (score.dq ? ' (DQ)' : '') + (score.dnf ? ' (DNF)' : '')});
      newTD (tr, {cn: 'reviewUSPSA',    text: shooter.sh_id || ''});
      newTD (tr, {cn: 'reviewSquad',    text: shooter.sh_sqd || ''});
      newTD (tr, {cn: 'reviewClass',    text: App.matchData.l.classes [shooter.sh_grd]});
      newTD (tr, {cn: 'reviewDivision', text: App.matchData.l.divisions [shooter.sh_dvp] + (score.pf ? '+' : '-')});
      newTD (tr, {cn: 'reviewA',        text: score.a + score.sh});
      newTD (tr, {cn: 'reviewB',        text: score.b});
      newTD (tr, {cn: 'reviewC',        text: score.c});
      newTD (tr, {cn: 'reviewD',        text: score.d});
      newTD (tr, {cn: 'reviewM',        text: score.m + score.sm});
      newTD (tr, {cn: 'reviewNS',       text: score.ns});
      newTD (tr, {cn: 'reviewNPM',      text: score.npm});
      newTD (tr, {cn: 'reviewProc',     text: score.p});
      newTD (tr, {cn: 'reviewAddPen',   text: score.ap});
      newTD (tr, {cn: 'reviewTime',     text: score.time.toFixed (2)});
      newTD (tr, {cn: 'reviewHF',       text: score.hf.toFixed (4)});
      newTD (tr, {cn: 'reviewDNF',      text: score.dnf ? 'Y' : ''});
      newTD (tr, {cn: 'reviewDQ',       text: score.dq ? 'Y' : ''});

      tbody.appendChild (tr);
    });

    table.id = 'reviewTable';
    table.className = 'useInZoom';
    table.appendChild (thead);
    table.appendChild (tbody);
    fragment.appendChild (table);

    $('#scores').empty ().append (fragment).show ();

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
           2: true, // Squad
           3: true, // Class
           4: true, // Division
          16: { // DNF
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
          17: { // DQ
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
        },
      },
    });

    return 0;
  };

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

    span.innerHTML = _.escape (stages [stageNo].stage_name + ' -- ' + divisionName);
    span.className = 'useInZoom';

    p.appendChild (span);
    p.id = 'scoresTop';
    fragment.appendChild (p);

    tr = document.createElement ('tr');

    _.each (['Place', 'Name', 'Num', 'Class', 'Division', 'Points', 'Penalty', 'Time', 'HF', 'Stg Pts', 'Stg %'], function (h) {
      var th = document.createElement ('th');
      th.innerHTML = h;
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    var pointsKey  = (divisionName === 'Combined') ? 'spts_o' : 'spts_d';
    var percentKey = (divisionName === 'Combined') ? 'spct_o' : 'spct_d';

    _.each (sortedScores, function (score, scoreIndex) {
      var shooter = qf.c [score.shooter];

      tr = document.createElement ('tr');

      newTD (tr, {cn: 'scoresPlace',    text: scoreIndex + 1});
      newTD (tr, {cn: 'scoresName',     text: shooter.sh_ln + ', ' + shooter.sh_fn + (score.dq ? ' (DQ)' : '') + (score.dnf ? ' (DNF)' : '')});
      newTD (tr, {cn: 'scoresNum',      text: shooter.sh_pos});
      newTD (tr, {cn: 'scoresClass',    text: App.matchData.l.classes [shooter.sh_grd]});
      newTD (tr, {cn: 'scoresDivision', text: App.matchData.l.divisions [shooter.sh_dvp] + (score.pf ? '+' : '-')});
      newTD (tr, {cn: 'scoresPoints',   text: score.points});
      newTD (tr, {cn: 'scoresPenalty',  text: score.penalty});
      newTD (tr, {cn: 'scoresTime',     text: score.time.toFixed (2)});
      newTD (tr, {cn: 'scoresHF',       text: score.hf.toFixed (4)});
      newTD (tr, {cn: 'scoresStgPts',   text: score [pointsKey].toFixed (4)});
      newTD (tr, {cn: 'scoresStgPct',   text: (score [percentKey] * 100).toFixed (2)});

      tbody.appendChild (tr);
    });

    table.id = 'scoresTable';
    table.className = 'useInZoom';
    table.appendChild (thead);
    table.appendChild (tbody);
    fragment.appendChild (table);

    $('#scores').empty ().append (fragment).show ();

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
          3: true, // Class
          4: true, // Division
        },
      },
    });

    return 0;
  };

  App.displayStageCombined = function (stageNo) {
    return App.displayStage ('Combined', stageNo, App.sortScoresByHF (App.scores.matchScoresByStage [stageNo]));
  };

  App.displayStageDivision = function (stageNo, divisionNo) {
    var sortedScores = App.sortScoresByHF (_.filter (App.scores.matchScoresByStage [stageNo], 'div', App.matchDivisions [divisionNo]));

    return App.displayStage (App.matchData.l.divisions [App.matchDivisions [divisionNo]], stageNo, sortedScores);
  };

  //
  //  Determine which display to use, based on the stage number, type and
  //  division. Stage 0 is the combined results for all stages, while actual
  //  stages are 1..n. 'type' indicates if the scores are combined, by
  //  division, or review (raw scores displayed)
  //
  App.displayResults = function (stageNo, type, divisionNo) {
    var r = -1;

    console.time ('displayResults');

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

    console.timeEnd ('displayResults');

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
      th.innerHTML = _.escape (App.matchData.l.divisions [d] || d);
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
      makeTD (tr, App.matchData.l.divisions [d], 's_s0_d' + divisionIndex);
    });

    tbody.appendChild (tr);

    _.each (stages, function (s, stageIndex) {
      tr = document.createElement ('tr');
      makeTD (tr, s.stage_name);
      makeTD (tr, 'Review', 's_s' + (stageIndex + 1) + '_r0');
      makeTD (tr, 'Combined', 's_s' + (stageIndex + 1) + '_c0');

      _.each (App.matchDivisions, function (d, divisionIndex) {
        makeTD (tr, App.matchData.l.divisions [d], 's_s' + (stageIndex + 1) + '_d' + divisionIndex);
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
        r [k] = _.isNumber (n [k]) ? (n [k] + (o [k] || 0)) : n [k];
      });

      r.time2 = r.time.toFixed (2);
    }

    return r;
  };

  App.displayIndividualResultsHeader = function () {
    var fragment = document.createDocumentFragment ();
    var h1 = document.createElement ('tr');
    var h2 = document.createElement ('tr');
    var th;

    _.each ([{t:'', c:1}, {t:'Hits & Misses', c:7}, {t:'Points', c:2}, {t:'Penalties', c:3}, {t:'Score', c:2}, {t:'Place', c:2}], function (h) {
      th = document.createElement ('th');
      th.innerHTML = _.escape (h.t);
      th.setAttribute ('colspan', h.c, 0);
      th.setAttribute ('ts-fixme', 1);
      th.className = 'sorter-false';
      th.style.textAlign = 'center';
      h1.appendChild (th);
    });

    _.each (['Stage', 'A', 'B', 'C', 'D', 'M', 'NPM', 'Steel', 'Paper', 'Steel', 'M', 'NS', 'Proc', 'Time', 'HF', 'Division', 'Combined'], function (f, fIndex) {
      th = document.createElement ('th');
      th.innerHTML = f;

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
      n += ' -- \'' + App.matchData.l.classes [shooter.sh_grd] + '\' Class';
      n += ' -- ' + App.matchData.l.divisions [shooter.sh_dvp] + ', ' + App.matchData.l.powerfactors [shooter.sh_pf];
      p.innerHTML = _.escape (n);
      p.id = 'individualShooterName';

      thead.appendChild (App.displayIndividualResultsHeader ());

      _.each (App.matchData.m.match_stages, function (stage, stageIndex) {
        var score = App.scores.matchScoresByStage [stageIndex][shooter.sh_uid];

        tr = document.createElement ('tr');

        newTD (tr, {text: _.escape (stage.stage_name) + (score.dnf ? ' <b>(DNF)</b>' : ''), noescape: true});
        newTD (tr, {text: score.a});
        newTD (tr, {text: score.b});
        newTD (tr, {text: score.c});
        newTD (tr, {text: score.d});
        newTD (tr, {text: score.m});
        newTD (tr, {text: score.npm});
        newTD (tr, {text: score.sh + '&nbsp;/&nbsp;' + score.st, noescape: true});
        newTD (tr, {text: score.paperp});
        newTD (tr, {text: score.steelp});
        newTD (tr, {text: score.mp});
        newTD (tr, {text: score.nsp});
        newTD (tr, {text: score.procp});
        newTD (tr, {text: score.time2});
        newTD (tr, {text: score.hf4});
        newTD (tr, {text: score.placeDiv + '&nbsp;/&nbsp;' + score.placeDivOf,         noescape: true});
        newTD (tr, {text: score.placeOverall + '&nbsp;/&nbsp;' + score.placeOverallOf, noescape: true});

        tbody.appendChild (tr);

        overall = App.sumScores (overall, score);
      });

      tr = document.createElement ('tr');

      newTD (tr, {text: 'Overall'});
      newTD (tr, {text: overall.a});
      newTD (tr, {text: overall.b});
      newTD (tr, {text: overall.c});
      newTD (tr, {text: overall.d});
      newTD (tr, {text: overall.m});
      newTD (tr, {text: overall.npm});
      newTD (tr, {text: overall.sh + '&nbsp;/&nbsp;' + overall.st, noescape: true});
      newTD (tr, {text: overall.paperp});
      newTD (tr, {text: overall.steelp});
      newTD (tr, {text: overall.mp});
      newTD (tr, {text: overall.nsp});
      newTD (tr, {text: overall.procp});
      newTD (tr, {text: overall.time2});
      newTD (tr, {text: ''});
      newTD (tr, {text: shooter.placeDiv + '&nbsp;/&nbsp;' + shooter.placeDivOf,         noescape: true});
      newTD (tr, {text: shooter.placeOverall + '&nbsp;/&nbsp;' + shooter.placeOverallOf, noescape: true});

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

    $('#scores').empty ().append (fragment).append (App.displayIndividualResultsMenu ()).show ();

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

        $('html').css ('cursor', 'progress');
        r = App.displayResults (stageNo, type, divisionNo);
        $('html').css ('cursor', 'default');
      }
    }

    if (urlParms.detail)
      r = App.displayIndividualResults (urlParms.detail);

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

    App.matchData = matchData;

    pmelib.removeDeletedShooters (matchData);
    pmelib.removeDeletedStages (matchData);
    App.matchDivisions = pmelib.getMatchDivisions (matchData);
    App.quickFind = pmelib.createQuickFindList (matchData);
    App.scores = App.calculateScores (matchData);
    App.gotoMap = pmelib.createGotoMap (matchData, App.matchDivisions);
    App.displayPage ((History.getState ().data && History.getState ().data.detail) || App.urlParms);
  };

  App.matchUpdated = function () {
    App.socket.emit ('match:request', {options: {all: true}});
  };

  App.kioskScores = function (param) {
    console.log ('edit/scores/uspsa.js: got kiosk_scores message'); // _DEBUG
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


  //
  //  'Main'
  //
  App.urlParms = pmelib.queryString ();

  if (App.urlParms.kiosk) {
    window.pmeModule = window.pmeModule || {name: 'scores'};
    window.pmeModule.enableKiosk = function () {
      App.socket.on ('kiosk_scores', App.kioskScores);
      App.socket.on ('kiosk_page', function (param) {
        if (param.url)
          window.location.href = param.url;
      });
    };
  }

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

  App.reload = function () {
    alert ('New match loaded, reloading scores page!');
    window.location.href = 'http://' + window.location.host + '/edit/scores';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_data', App.matchDataReceived);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {'msg': 'Edit/View->Scores (USPSA)'});
});
