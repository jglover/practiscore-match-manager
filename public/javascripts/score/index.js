/* global io */
/* global _:false */
/* jshint devel: true */

$(function () {
  'use strict';

  var App = {};

  App.vars = {
    currentPage: '#stagePage',
    stageList: [],
    squadList: [],
    shooterList: [],
    stageNumber: -1,
    stageInfo: {},
    squadNumber: -1,
    shooterIndex: -1,
    shooterInfo: {},
    shooterScores: {},
    matchData: {},
    tableScores: [],
    zoneMaskShift: {a: 0, b: 4, c: 8, d: 12, ns: 16, m: 20, npm: 24},
  };

  App.initializeScoringData = function () {
    if (!App.vars.matchData.s) {
      alert ('No App.vars.matchData.s');
      App.vars.matchData.s = {
        match_id: App.vars.matchData.m.match_id,
        match_scores: [],
        match_score_history: {},
      };
    }

    _.each (App.vars.matchData.m.match_stages, function (stage) {
      var stageIndex = stage.stage_number - 1;

      if (!App.vars.matchData.s.match_scores [stageIndex]) {
        App.vars.matchData.s.match_scores [stageIndex] = {
          stage_number: stage.stage_number,
          stage_uuid: stage.stage_uuid,
          stage_stagescores: [],
        };

        alert ('Eeek! Had to create match_scores for stage ' + stage.stage_number);
      }
    });
  };

  App.initializeScoresTable = function () {
    _.each (App.vars.stageInfo.stage_targets, function (t) {
      App.vars.tableScores [t.target_number - 1] = {a: '', b: '', c: '', d: '', ns: '', m: '', npm: '', state: 'noscores', npmstate: t.target_maxnpms ? 'noscores' : 'disabled'};
    });
  };

  App.findShooterScores = function () {
    var shooter = App.vars.shooterInfo;
    var stage = App.vars.stageInfo;
    var stageScores;
    var shooterScores;

    App.vars.shooterScores = null;

    if (!(stageScores = _.find (App.vars.matchData.s.match_scores, {'stage_number': stage.stage_number}))) {
      alert ('Can\'t find scores for stage ' + stage.stage_number);
      return;
    }

    if (!(shooterScores = _.find (stageScores.stage_stagescores, {'shtr': shooter.sh_uid}))) {
      console.log ('Initializing scores for shooter %s %s on stage %s', shooter.sh_fn, shooter.sh_ln, stage.stage_number);

      shooterScores = App.vars.shooterScores = {
        aprv:  false,
        dnf:   false,
        mod:   '',
        poph:  0,
        popm:  0,
        str:   Array.apply (null, new Array (stage.stage_strings)).map (Number.prototype.valueOf, 0),
        ts:    Array.apply (null, new Array (stage.stage_targets.length)).map (Number.prototype.valueOf, 0),
        shtr:  shooter.sh_uid,
        dname: 'WTF?',
      };
    }

    if (shooterScores.ts.length !== stage.stage_targets.length) {
      alert (shooter.sh_fn + ' ' + shooter.sh_ln + ' has ' + shooterScores.ts.length + ' targets, stage has ' + stage.stage_targets.length + ' targets!');
      console.dir (shooterScores);
      return;
    }

    App.vars.shooterScores = shooterScores;
  };

  App.updateScoresTableRowState = function (targetIndex) {
    var target = App.vars.stageInfo.stage_targets [targetIndex];
    var shooterScore = App.vars.shooterScores.ts [targetIndex];

    App.vars.tableScores [targetIndex] = {
        a: ((shooterScore >> App.vars.zoneMaskShift.a)   & 0xf) || '',
        b: ((shooterScore >> App.vars.zoneMaskShift.b)   & 0xf) || '',
        c: ((shooterScore >> App.vars.zoneMaskShift.c)   & 0xf) || '',
        d: ((shooterScore >> App.vars.zoneMaskShift.d)   & 0xf) || '',
       ns: ((shooterScore >> App.vars.zoneMaskShift.ns)  & 0xf) || '',
        m: ((shooterScore >> App.vars.zoneMaskShift.m)   & 0xf) || '',
      npm: ((shooterScore >> App.vars.zoneMaskShift.npm) & 0xf) || '',
    };

    var tableScoreRow = App.vars.tableScores [targetIndex];
    var scoringHits = (tableScoreRow.a * 1) + (tableScoreRow.b * 1) + (tableScoreRow.c * 1) + (tableScoreRow.d * 1) + (tableScoreRow.m * 1);

    if ((tableScoreRow.npm * 1) > (target.target_maxnpms * 1))
      tableScoreRow.state = 'error';
    else if (!scoringHits)
      tableScoreRow.state = 'noscores';
    else if (scoringHits === (target.target_reqshots * 1))
      tableScoreRow.state = 'complete';
    else if (scoringHits > target.target_reqshots)
      tableScoreRow.state = 'error';
    else
      tableScoreRow.state = 'inprogress';

    tableScoreRow.npmstate = target.target_maxnpms ? tableScoreRow.state : 'disabled';
  };

  App.updateScoresTableRow = function (targetIndex) {
    var trow = $('#scoreTbody tr[target-index=' + targetIndex + ']');

    App.updateScoresTableRowState (targetIndex);

    $('td[cell-type=hit]', trow)
      .removeClass ()
      .addClass (App.vars.tableScores [targetIndex].state);
    $('td[cell-type=npm]', trow)
      .removeClass ()
      .addClass (App.vars.tableScores [targetIndex].npmstate);

    _.each (['a', 'b', 'c', 'd', 'm', 'ns', 'npm'], function (cell) {
      $('div[cell-zone=' + cell + ']', trow).text (App.vars.tableScores [targetIndex][cell]);
    });
  };

  App.updateScoresTable = function () {
    _.each (App.vars.shooterScores.ts, function (score, index) {
      App.updateScoresTableRow (index);
    });
  };

  App.createScoresTable = function () {
    App.initializeScoresTable ();
    App.findShooterScores ();
    App.updateScoresTable ();

    return App.vars.tableScores;
  };

  App.makeNameDivPF = function (shooter) {
    var r = shooter.sh_ln + ', ' + shooter.sh_fn + ' (' + shooter.sh_dvp;

    if ((shooter.sh_dvp !== 'PROD') && (shooter.sh_dvp !== 'CO'))
      r += (shooter.sh_pf === 'MAJOR' ? '+' : '-');

    r += ')';

    return r;
  };

  App.addListItemLink = function (ulName, property, value, html) {
    var a = document.createElement ('a');
    var li = document.createElement ('li');

    a [property] = value;
    a.innerHTML = html;
    a.href = '#';
    a.className = 'ui-btn ui-btn-icon-right ui-icon-carat-r';

    li.appendChild (a);

    $(ulName).append (li);
  };

  App.createStagePage = function () {
    App.vars.stageList = [];
    $('#stageUL').empty ();

    _.each (
      _.sortBy (App.vars.matchData.m.match_stages, function (stage) {
        return stage.stage_number * 1;
      }),
      function (stage) {
        App.vars.stageList [stage.stage_number] = {number: stage.stage_number, name: stage.stage_name, stage: stage};
        App.addListItemLink ('#stageUL', 'stage', stage.stage_number, stage.stage_number + ': ' + stage.stage_name);
      }
    );

    $('#stageH1').html (App.vars.matchData.m.match_name);
    $('#stageUL')
      .enhanceWithin ()
      .off ()
      .click (function (e) {
        App.vars.stageNumber = e.target.stage;
        App.vars.stageInfo = App.vars.stageList [e.target.stage].stage;
        e.preventDefault ();
        $(':mobile-pagecontainer').pagecontainer ('change', '#squadPage');
        App.createSquadPage ();
      });
  };

  App.createSquadPage = function () {
    App.vars.squadList = [];
    $('#squadUL').empty ();

    _.each (
      _.sortBy (
        _.map (
          _.uniq (App.vars.matchData.m.match_shooters, function (shooter) {
            return (shooter.sh_sqd || 0) * 1;
          }),
          function (shooter) {
            return (shooter.sh_sqd || 0) * 1;
          }),
        function (squad) {
          return squad;
        }),
      function (squad) {
        App.vars.squadList [squad] = {number: squad, name: 'Squad ' + squad};
        App.addListItemLink ('#squadUL', 'squad', squad, 'Squad ' + squad);
      }
    );

    $('#squadH1').html (App.vars.stageNumber + ': ' + App.vars.stageList [App.vars.stageNumber].name);
    $('#squadHeader').toolbar ({'addBackBtn': true});
    $('#squadUL')
      .enhanceWithin ()
      .off ()
      .click (function (e) {
        App.vars.squadNumber = e.target.squad * 1;
        App.createShootersPage ();
        e.preventDefault ();
        $(':mobile-pagecontainer').pagecontainer ('change', '#shootersPage');
      });
  };

  App.createShootersPage = function () {
    var squadMates = [];

    App.vars.shooterList = [];
    $('#shootersUL').empty ();

    _.each (App.vars.matchData.m.match_shooters, function (shooter, index) {
      if ((shooter.sh_sqd * 1) === App.vars.squadNumber)
        squadMates.push ({index: index, shooter: shooter});
    });

    _.each (
      _.sortBy (squadMates, function (sm) {
        return sm.shooter.sh_ln + sm.shooter.sh_fn;
      }),
      function (sm) {
        App.vars.shooterList [sm.index] = sm;
        App.addListItemLink ('#shootersUL', 'shooter', sm.index, App.makeNameDivPF (sm.shooter));
      }
    );

    $('#shootersDivStage').html (App.vars.stageNumber + ': ' + App.vars.stageList [App.vars.stageNumber].name);
    $('#shootersDivSquad').html ('Squad ' + App.vars.squadNumber);
    $('#shootersHeader').toolbar ({'addBackBtn': true});
    $('#shootersUL')
      .enhanceWithin ()
      .off ()
      .click (function (e) {
        App.vars.shooterIndex = e.target.shooter;
        App.vars.shooterInfo = App.vars.matchData.m.match_shooters [e.target.shooter];
        App.createScoringPage ();
        e.preventDefault ();
        $(':mobile-pagecontainer').pagecontainer ('change', '#scorePage');
      });
  };

  App.createScoringPage = function () {
    var tableScores = App.createScoresTable (App.vars.shooterInfo, App.vars.stageInfo);

    $('#scoreDivShooter').html (App.makeNameDivPF (App.vars.shooterInfo));
    $('#scoreDivStage').html (App.vars.stageNumber + ': ' + App.vars.stageList [App.vars.stageNumber].name);
    $('#scoreDiv')
      .empty ()
      .append ($('<table />').attr ('id', 'scoreTable')
        .append ($('<thead />')
          .append ($('<tr />')
            .append ($('<th />').attr ('id', 'scores-clearall').text ('T#'))
            .append ($('<th />').text ('A'))
            .append ($('<th />').text ('B'))
            .append ($('<th />').text ('C'))
            .append ($('<th />').text ('D'))
            .append ($('<th />').text ('M'))
            .append ($('<th />').text ('NS'))
            .append ($('<th />').text ('NPM'))
          )
        ).append ($('<tbody />')
          .attr ('id', 'scoreTbody')
        )
      );

    var scoreTbody = $('#scoreTbody');

    _.each (App.vars.stageInfo.stage_targets, function (target) {
      if (!target.target_deleted) {
        var targetIndex = target.target_number - 1;
        var hits = tableScores [targetIndex];

        $(scoreTbody)
          .append ($('<tr />').attr ({'target-index': targetIndex})
            .append ($('<td />').attr ({'target-zone': 't'}).addClass ('noborder ignoretap')
              .append ($('<div />').addClass ('zone-dummy'))
              .append ($('<div />').addClass ('zone target-line').text (target.target_number))
            ).append ($('<td />').attr ({'target-zone': 'a', 'cell-type': 'hit'}).addClass (hits.state)
              .append ($('<div />').addClass ('zone-dummy'))
              .append ($('<div />').addClass ('zone').attr ({'cell-zone': 'a'}).text (hits.a))
            ).append ($('<td />').attr ({'target-zone': 'b', 'cell-type': 'hit'}).addClass (hits.state)
              .append ($('<div />').addClass ('zone-dummy'))
              .append ($('<div />').addClass ('zone').attr ({'cell-zone': 'b'}).text (hits.b))
            ).append ($('<td />').attr ({'target-zone': 'c', 'cell-type': 'hit'}).addClass (hits.state)
              .append ($('<div />').addClass ('zone-dummy'))
              .append ($('<div />').addClass ('zone').attr ({'cell-zone': 'c'}).text (hits.c))
            ).append ($('<td />').attr ({'target-zone': 'd', 'cell-type': 'hit'}).addClass (hits.state)
              .append ($('<div />').addClass ('zone-dummy'))
              .append ($('<div />').addClass ('zone').attr ({'cell-zone': 'd'}).text (hits.d))
            ).append ($('<td />').attr ({'target-zone': 'm', 'cell-type': 'hit'}).addClass (hits.state)
              .append ($('<div />').addClass ('zone-dummy'))
              .append ($('<div />').addClass ('zone').attr ({'cell-zone': 'm'}).text (hits.m))
            ).append ($('<td />').attr ({'target-zone': 'ns', 'cell-type': 'hit'}).addClass (hits.state)
              .append ($('<div />').addClass ('zone-dummy'))
              .append ($('<div />').addClass ('zone').attr ({'cell-zone': 'ns'}).text (hits.ns))
            ).append ($('<td />').attr ({'target-zone': 'npm', 'cell-type': 'npm'}).addClass (hits.npmstate)
              .append ($('<div />').addClass ('zone-dummy'))
              .append ($('<div />').addClass ('zone').attr ({'cell-zone': 'npm'}).text (hits.npm))
            )
          );
      }
    });

    $('#scoreTable')
      .off ()
      .on ('tap', 'td', function (e) {
        var targetIndex = $(this).closest ('tr').attr ('target-index') * 1;
        var td = $(this).closest ('td');
        var zone = $(td).attr ('target-zone');

        if (!$(td).hasClass ('disabled') && !$(td).hasClass ('ignoretap')) {
          var count = (App.vars.shooterScores.ts [targetIndex] >> App.vars.zoneMaskShift [zone]) & 0xf;

          if (count < 15) {
            App.vars.shooterScores.ts [targetIndex] &= ~(0xf << App.vars.zoneMaskShift [zone]);
            App.vars.shooterScores.ts [targetIndex] |= ((count + 1) << App.vars.zoneMaskShift [zone]);
            App.updateScoresTableRow (targetIndex);
          }
        }

        e.preventDefault ();
      })
      .on ('taphold', '#scores-clearall', function (e) {
        for (var i = 0; i < App.vars.shooterScores.ts.length; i++)
          App.vars.shooterScores.ts [i] = 0;

        App.updateScoresTable ();
        e.preventDefault ();
      })
      .on ('taphold', 'td', function (e) {
        var targetIndex = $(this).closest ('tr').attr ('target-index') * 1;
        var td = $(this).closest ('td');
        var zone = $(td).attr ('target-zone');

        if (zone === 't') {
          App.vars.shooterScores.ts [targetIndex] = 0;
          App.updateScoresTableRow (targetIndex);
        } else if (!$(td).hasClass ('disabled')) {
          App.vars.shooterScores.ts [targetIndex] &= ~(0xf << App.vars.zoneMaskShift [zone]);
          App.updateScoresTableRow (targetIndex);
        }

        e.preventDefault ();
      });
  };

  App.createPages = function (matchData) {
    if (!matchData || !matchData.m || !matchData.m.match_stages || !matchData.m.match_stages.length) {
      $(':mobile-pagecontainer').pagecontainer ('change', '#noStagesPage');
      return;
    }

    if (!matchData || !matchData.m || !matchData.m.match_shooters || !matchData.m.match_shooters.length) {
      $(':mobile-pagecontainer').pagecontainer ('change', '#noShootersPage');
      return;
    }

    $.event.special.tap.emitTapOnTaphold = false;

    App.vars.matchData = matchData;

    App.initializeScoringData ();
    App.createStagePage ();

    $(':mobile-pagecontainer').pagecontainer ('change', App.vars.currentPage);
  };

  //
  //
  //
  App.socketConnect = function () {
    App.socket.emit ('match:request', {options: {match: true, scores: true}});
  };

  App.socketDisconnect = function () {
  };

  App.matchDataReceived = function (param) {
    App.createPages (param.matchData);
  };

  App.matchUpdatedReceived = function () {
    App.socket.emit ('match:request', {options: {match: true, scores: true}});
  };

  //
  //  Ye olde main...
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_data', App.matchDataReceived);
  App.socket.on ('match_updated', App.matchUpdatedReceived);
  App.socket.emit ('log:log', {'msg': 'Score'});
});
