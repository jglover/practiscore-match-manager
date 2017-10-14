/* global io, History, pmelib */
/* global console:false, _:false */
/* jshint eqnull:true */

$(function () {
  'use strict';

  var App = {};
  App.matchDivisions = {};
  App.matchScoresOverall = {};
  App.matchScoresByStage = [];
  App.quickFind = {};

  //
  //  Parse any parameters on the URL string. We're only interested if
  //  'display' is present, so that we go immediately to the desired page.
  //
  var queryString = function () {
    var query_string = {};
    var query = window.location.search.substring (1);
    var vars = query.split ('&');

    for (var i = 0; i < vars.length; i++) {
      var pair = vars [i].split ('=');

      if (typeof query_string [pair [0]] === 'undefined')
        query_string [pair [0]] = pair [1];
      else if (typeof query_string [pair [0]] === 'string') {
        var arr = [ query_string [pair [0]], pair [1] ];
        query_string [pair [0]] = arr;
      } else
        query_string [pair [0]].push (pair [1]);
    }

    return query_string;
  };

  //
  //  The quick-find list lets us use the shooter UID and stage UUID's to
  //  quickly find that shooter or stage, rather than search the array each
  //  time.
  //
  App.createQuickFindList = function (match, scores) {
    App.quickFind = {'c': {}, 's': {}, 'S': {}};

    _.each (match.match_shooters, function (c) {
      App.quickFind.c [c.sh_uid] = c;
    });

    _.each (match.match_stages, function (s) {
      App.quickFind.s [s.stage_uuid] = s;
    });

    //
    //  The match scores might be empty, or some of the stages may not have
    //  scores, so populate any missing entries with an empty array so they
    //  exist.
    //
    scores = scores || {};
    scores.match_id = scores.match_id || match.match_id;
    scores.match_scores = scores.match_scores || [];

    _.each (match.match_stages, function (s, stageIndex) {
      if (!scores.match_scores [stageIndex]) {
        scores.match_scores [stageIndex].stage_number = stageIndex + 1;
        scores.match_scores [stageIndex].stage_uuid = match.match_stages [stageIndex].stage_uuid;
        scores.match_scores [stageIndex].stage_stagescores = [];
      }
    });

    //
    //  The S hash contains the shooters UID for each stage, which contains a
    //  hash that has an index of the stage, and an index of the score. With a
    //  shooter UID, we can quickly find the score for that shooter, and the
    //  stage index.
    //
    _.each (scores.match_scores, function (s, stageIndex) {
      App.quickFind.S [s.stage_uuid] = {};

      _.each (s.stage_stagescores, function (stageScore, stageScoreIndex) {
        App.quickFind.S [s.stage_uuid][stageScore.shtr] = {
          'stage': stageIndex,
          'score': stageScoreIndex
        };
      });
    });

    //
    //  Because each stage might not contain complete data (mid-match results,
    //  for example), we need to add any missing shooters, and set their time,
    //  hits, etc to 0. This will make sure that all shooters are shown in the
    //  stage results.
    //
    _.each (scores.match_scores, function (stage, stageIndex) {
      _.each (match.match_shooters, function (shooter) {
        if (!App.quickFind.S [stage.stage_uuid][shooter.sh_uid]) {
          scores.match_scores [stageIndex].stage_stagescores.push ({
            'shtr': shooter.sh_uid,
            'div': shooter.sh_dvp,
            'del': shooter.sh_del,
            'dq': shooter.sh_dq,
            'dnf': false,
          });
          App.quickFind.S [stage.stage_uuid][shooter.sh_uid] = {
            'stage': stageIndex,
            'score': scores.match_scores [stageIndex].stage_stagescores.length - 1,
          };
        }
      });
    });
  };

  //
  //  Run through all the stages and shooters, calculating the scores for any
  //  scores that exist. Deleted shooters should already be removed, DQed
  //  shooters and DNFs return all 0's.
  //
  App.calculateScores = function () {
    var bons = App.matchData.m.match_bonuses || [];
    var pens = App.matchData.m.match_penalties || [];

    _.each (App.matchData.m.match_shooters, function (shooter) {
      shooter.noscore = 0;
      shooter.rtime = 0;
      shooter.ptime = 0;
      shooter.btime = 0;
      shooter.ftime = 0;
      shooter.placeDiv = 0;
      shooter.placeDivOf = 0;
      shooter.placeOverall = 0;
      shooter.placeOverallOf = 0;
    });

    _.each (App.matchData.s.match_scores, function (stageScores, stageIndex) {
      var stage = App.quickFind.s [stageScores.stage_uuid];

      App.matchScoresByStage [stageIndex] = {};

      _.each (stageScores.stage_stagescores, function (score) {
        App.matchScoresByStage [stageIndex][score.shtr] = pmelib.calculateScore (bons, pens, stage, score, App.quickFind.c [score.shtr]);
      });

      if (_.size (App.matchScoresByStage [stageIndex])) {
        var sortedScores = App.sortScoresByTime (App.matchScoresByStage [stageIndex]);
        var sortedScoresLength = sortedScores.length;
        var divPlace = {};

        _.each (sortedScores, function (score, scoreIndex) {
          divPlace [score.div] = divPlace [score.div] || 0;
          score.placeDiv = ++divPlace [score.div];
          score.placeOverall = scoreIndex + 1;
          score.placeOverallOf = sortedScoresLength;

          App.quickFind.c [score.shooter].noscore += score.noscore;
          App.quickFind.c [score.shooter].rtime   += score.rtime;
          App.quickFind.c [score.shooter].ptime   += score.ptime;
          App.quickFind.c [score.shooter].btime   += score.btime;
          App.quickFind.c [score.shooter].ftime   += score.ftime;
        });

        _.each (sortedScores, function (score) {
          score.placeDivOf = divPlace [score.div];
        });
      }
    });

    App.matchScoresOverall.combined = _.sortBy (App.matchData.m.match_shooters, function (shooter) {
      return (shooter.noscore > 0) ? shooter.noscore : shooter.ftime;
    });

    _.each (App.matchScoresOverall.combined, function (shooter, shooterIndex) {
      shooter.placeOverall = shooterIndex + 1;
      shooter.placeOverallOf = App.matchScoresOverall.combined.length;
    });

    _.each (App.matchDivisions, function (d) {
      App.matchScoresOverall [d] = _.sortBy (_.filter (App.matchData.m.match_shooters, 'sh_dvp', d), function (shooter) {
        return (shooter.noscore > 0) ? shooter.noscore : shooter.ftime;
      });

      _.each (App.matchScoresOverall [d], function (shooter, shooterIndex) {
        shooter.placeDiv = shooterIndex + 1;
        shooter.placeDivOf = App.matchScoresOverall [d].length;
      });
    });

  };

  //
  //
  //
  App.createGotoMap = function () {
    var stages = App.matchData.m.match_stages;

    App.gotoMap = {byStage: {}, byDivision: {}, review: {}};
    App.gotoMap.byDivision.combined = {overall: 's_s0_c0'};
    App.gotoMap.byStage.overall = {combined: 's_s0_c0'};

    _.each (stages, function (s, stageIndex) {
      App.gotoMap.review [stageIndex + 1] = 's_s' + (stageIndex + 1) + '_r0';
      App.gotoMap.byDivision.combined [stageIndex + 1] = 's_s' + (stageIndex + 1) + '_c0';
      App.gotoMap.byStage [stageIndex + 1] = App.gotoMap.byStage [stageIndex + 1] || {};
      App.gotoMap.byStage [stageIndex + 1].combined = 's_s' + (stageIndex + 1) + '_c0';
    });

    _.each (App.matchDivisions, function (d, divisionIndex) {
      App.gotoMap.byDivision [d] = App.gotoMap.byDivision [d] || {};
      App.gotoMap.byDivision [d].overall = 's_s0_d' + divisionIndex;

      _.each (stages, function (s, stageIndex) {
        App.gotoMap.byDivision [d][stageIndex + 1] = 's_s' + (stageIndex + 1) + '_d' + divisionIndex;
      });
    });

    _.each (stages, function (s, stageIndex) {
      App.gotoMap.byStage [stageIndex + 1].overall = 's_s' + (stageIndex + 1) + '_d0';

      _.each (App.matchDivisions, function (d, divisionIndex) {
        App.gotoMap.byStage [stageIndex + 1][d] = 's_s' + (stageIndex + 1) + '_d' + divisionIndex;
      });
    });
  };

  //
  //
  //
  App.sortScoresByTime = function (scores) {
    return _.sortBy (scores, function (score) {
      return (score.noscore > 0) ? score.noscore : score.ftime;
    });
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
          title: shooter.sh_fn + ' ' + shooter.sh_ln + ' -- ' + stage.stage_name,
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
          title: shooter.sh_fn + ' ' + shooter.sh_ln + ' -- ' + stage.stage_name,
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
  //  Combined overall is calculated by summing the stage points of all the
  //  stages, with the highest combined points being the 'reference', and each
  //  shooters match percentage being thier total points divided by the the
  //  reference value.
  //
  //  FIXME: This needs to display all stages like https://practiscore.com/results.php?uuid=50b89382-93f1-4946-8305-40eccb99cfe4&page=matchCombined
  //
  App.displayOverall = function (divisionName, sortedShooters) {
    var fragment = document.createDocumentFragment ();
    var p = document.createElement ('p');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr;
    var bestTime = 0;

    p.innerHTML = _.escape ('Combined -- ' + divisionName);
    p.id = 'combinedTop';

    tr = document.createElement ('tr');

    _.each (['Place', 'Name', 'No.', 'Class', 'Division', 'Raw Time', 'Penalties', 'Bonuses', 'Final Time', 'Diff'], function (h) {
      var th = document.createElement ('th');
      th.innerHTML = _.escape (h);
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    _.each (sortedShooters, function (shooter, shooterIndex) {
      tr = document.createElement ('tr');
      var diffTime = !shooterIndex ? 0 : shooter.ftime - bestTime;

      newTD (tr, {cn: 'combinedPlace',     text: shooterIndex + 1});
      newTD (tr, {cn: 'combinedName',      text: shooter.sh_ln + ', ' + shooter.sh_fn + (shooter.sh_dq ? ' (DQ)' : '')});
      newTD (tr, {cn: 'combinedNo',        text: shooter.sh_num});
      newTD (tr, {cn: 'combinedClass',     text: shooter.sh_grd});
      newTD (tr, {cn: 'combinedDivision',  text: shooter.sh_dvp});
      newTD (tr, {cn: 'combinedRawTime',   text: shooter.noscore ? '--' : shooter.rtime.toFixed (2)});
      newTD (tr, {cn: 'combinedPenalties', text: shooter.noscore ? '--' : shooter.ptime.toFixed (2)});
      newTD (tr, {cn: 'combinedBonuses',   text: shooter.noscore ? '--' : shooter.btime.toFixed (2)});
      newTD (tr, {cn: 'combinedTime',      text: shooter.noscore ? '--' : shooter.ftime.toFixed (2)});
      newTD (tr, {cn: 'combinedDiff',      text: shooter.noscore ? '--' : diffTime.toFixed (2)});

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
          3: true, // Class
          4: true, // Division
        },
      },
    });

    return 0;
  };

  App.displayOverallCombined = function () {
    return App.displayOverall ('Combined', App.matchScoresOverall.combined);
  };

  App.displayOverallDivision = function (divisionNo) {
    return App.displayOverall (App.matchDivisions [divisionNo], App.matchScoresOverall [App.matchDivisions [divisionNo]]);
  };

  //
  //
  //
  App.displayStageReview = function (stageNo) {
    var stage = App.matchData.m.match_stages [stageNo];
    var qf = App.quickFind;
    var fragment = document.createDocumentFragment ();
    var p = document.createElement ('p');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr;

    var sortedScores = _.sortBy (App.matchScoresByStage [stageNo], function (score) {
      var shooter = qf.c [score.shooter];
      return shooter.sh_ln + ', ' + shooter.sh_fn;
    });

    p.innerHTML = _.escape (stage.stage_name + ' -- Review');
    p.id = 'reviewTop';
    fragment.appendChild (p);

    tr = document.createElement ('tr');

    _.each (['Name', 'No. ', 'Squad', 'Class', 'Division', 'Raw Time', 'Penalties', 'Bonuses', 'Final Time', 'DNF', 'DQ'], function (h) {
      var th = document.createElement ('th');
      th.innerHTML = _.escape (h);
      tr.appendChild (th);
    });

    thead.appendChild (tr);

    _.each (sortedScores, function (score, scoreIndex) {
      var shooter = qf.c [score.shooter];
      var rtime2 = (score.noscore && !score.rtime) ? '--' : score.rtime2;
      var ptime2 = (score.noscore && !score.rtime) ? '--' : score.ptime2;
      var btime2 = (score.noscore && !score.rtime) ? '--' : score.btime2;
      var ftime2 = (score.noscore && !score.rtime) ? '--' : score.ftime2;

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
      newTD (tr, {cn: 'reviewDNF',       text: score.dnf ? 'Y' : ''});
      newTD (tr, {cn: 'reviewDQ',        text: score.dq  ? 'Y' : ''});

      tbody.appendChild (tr);
    });

    table.id = 'reviewTable';
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
           2: true, // Squad
           3: true, // Class
           4: true, // Division
           9: { // DNF
            'Yes' : function (e) { return e === 'Y'; },
            'No'  : function (e) { return e === ''; },
          },
          10: { // DQ
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
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr;
    var bestTime = 0;

    p.innerHTML = _.escape (stages [stageNo].stage_name + ' -- ' + divisionName);
    p.id = 'scoresTop';
    fragment.appendChild (p);

    tr = document.createElement ('tr');

    _.each (['Place', 'Name', 'No.', 'Class', 'Division', 'Raw Time', 'Penalties', 'Bonuses', 'Final Time', 'Diff'], function (h) {
      var th = document.createElement ('th');
      th.innerHTML = _.escape (h);
      tr.appendChild (th);
    });

    thead.appendChild (tr);

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

      tbody.appendChild (tr);

      if (!bestTime)
        bestTime = score.ftime;
    });

    table.id = 'scoresTable';
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
          3: true, // Class
          4: true, // Division
        },
      },
    });

    return 0;
  };

  App.displayStageCombined = function (stageNo) {
    return App.displayStage ('Combined', stageNo, App.sortScoresByTime (App.matchScoresByStage [stageNo]));
  };

  App.displayStageDivision = function (stageNo, divisionNo) {
    var sortedScores = App.sortScoresByTime (_.filter (App.matchScoresByStage [stageNo], 'div', App.matchDivisions [divisionNo]));

    return App.displayStage (App.matchDivisions [divisionNo], stageNo, sortedScores);
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
    table.appendChild (thead);
    table.appendChild (tbody);

    return table;
  };

  App.displayIndividualResultsMenu = function () {
    var fragment = document.createDocumentFragment ();
    var p;

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

    p = document.createElement ('p');
    fragment.appendChild (p);

    p = document.createElement ('p');
    p.innerHTML = 'Display detailed results for ';
    p.id = 'individualDropdown';
    p.appendChild (s);

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

    _.each ([{t:'', c:1}, {t:'Score', c:4}, {t:'Place', c:2}], function (h) {
      th = document.createElement ('th');
      th.innerHTML = h.t;
      th.setAttribute ('colspan', h.c, 0);
      th.setAttribute ('ts-fixme', 1);
      th.className = 'sorter-false';
      th.style.textAlign = 'center';
      h1.appendChild (th);
    });

    _.each (['Stage', 'Raw Time', 'Penalties', 'Bonuses', 'Final Time', 'Division', 'Combined'], function (f, fIndex) {
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
        var score = App.matchScoresByStage [stageIndex][shooter.sh_uid];
        var rtime2 = (score.noscore && !score.rtime) ? '--' : score.rtime2;
        var ptime2 = (score.noscore && !score.rtime) ? '--' : score.ptime2;
        var btime2 = (score.noscore && !score.rtime) ? '--' : score.btime2;
        var ftime2 = (score.noscore && !score.rtime) ? '--' : score.ftime2;

        tr = document.createElement ('tr');

        newTD (tr, {text: _.escape (stage.stage_name) + (score.dnf ? ' <b>(DNF)</b>' : ''), noescape: true});
        newTD (tr, {text: rtime2});
        newTD (tr, {text: ptime2, id: score.ptime ? ('pen_' + stageIndex) : null});
        newTD (tr, {text: btime2, id: score.btime ? ('bon_' + stageIndex) : null});
        newTD (tr, {text: ftime2});
        newTD (tr, {text: score.placeDiv + '&nbsp;/&nbsp;' + score.placeDivOf,         noescape: true});
        newTD (tr, {text: score.placeOverall + '&nbsp;/&nbsp;' + score.placeOverallOf, noescape: true});

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
      newTD (tr, {text: shooter.placeDiv + '&nbsp;/&nbsp;' + shooter.placeDivOf,         noescape: true});
      newTD (tr, {text: shooter.placeOverall + '&nbsp;/&nbsp;' + shooter.placeOverallOf, noescape: true});

      tbodyNoSort.className = 'cssInfoBlock';
      tbodyNoSort.appendChild (tr);

      table.id = 'individualTable';
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

  App.matchData = function (param) {
    var matchData = param.matchData;

    if (!matchData || !matchData.m || !matchData.m.match_shooters || !matchData.m.match_shooters.length)
      return App.errorMessage ('(No competitors present)');

    if (!matchData || !matchData.m || !matchData.m.match_stages || !matchData.m.match_stages.length)
      return App.errorMessage ('(No stages present)');

    if (!matchData || !matchData.s || !matchData.s.match_scores || !matchData.s.match_scores.length)
      return App.errorMessage ('(No scores present)');

    App.matchData = matchData;
    console.time ('prepareMatchData');
    pmelib.removeDeletedShooters (matchData);
    pmelib.removeDeletedStages (matchData);
    App.matchDivisions = pmelib.getMatchDivisions (matchData);
    App.createQuickFindList (matchData.m, matchData.s);
    console.timeEnd ('prepareMatchData');
    console.time ('calculateScores');
    App.calculateScores ();
    console.timeEnd ('calculateScores');
    App.createGotoMap ();

    App.displayPage ((History.getState ().data && History.getState ().data.detail) || queryString ());
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

  window.pmeModule = window.pmeModule || {name: 'scores'};
  window.pmeModule.enableKiosk = function () {
    App.socket.on ('kiosk_scores', App.kioskScores);
    App.socket.on ('kiosk_page', App.kioskPage);
  };

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
  App.socket.on ('match_data', App.matchData);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.emit ('log:log', {'msg': 'Edit/View->Scores (TPP)'});
});
