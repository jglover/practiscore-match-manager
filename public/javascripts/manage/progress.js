/* jshint devel: true */
/* global io, moment, pmelib */
/* global _:false */

$(function () {
  'use strict';

  var App = {};

  App.timeFormatUTC = function (time) {
    return moment.utc (time).local ().format ('YYYY-MM-DD HH:mm:ss');
  };

  App.initializeVariables = function () {
    App.data = {};
    App.data.deleted = 0;             // Number of deleted shooters (sh_del === true)
    App.data.dq = 0;                  // Number of DQed shooters (sh_dq === true)
    App.data.dnf = 0;                 // Number of DNF scores
    App.data.filtered = 0;            // Number of filtered shooters (by squad, shooter, etc)
    App.data.zerotime = 0;            // Number of shooters with data but zero times
    App.data.dataerrors = 0;          // Number of shooters with errored data (typically partial scores from Android)
    App.data.deadscore = 0;           // Number of scores with no associated shooter present (because of delete, dq, filter, etc)
    App.data.squadList = [];          // Array of used squad numbers ([1, 2, ..., 98, 99])
    App.data.squadWithShooters = {};  // Hash of squads and shoooters ({98: [1, 2, 3], 99: [4, 5, 6]})
    App.data.shootersByUID = {};      // Hash of shooter UIDs referencing matchData.m.match_shooters
    App.data.deletedList = {};        // List of deleted shooters (sh_del === true)
    App.data.dqList = {};             // List of DQed shooters (sh_dq === true)
    App.data.zerotimeList = {};       // List of shooters with data but zero times
    App.data.dataerrorsList = {};     // List of shooters with errored data
  };

  //
  //  Return the timestamp of the newest score in the match
  //
  App.findNewestScore = function (scores) {
    var newest = '';

    scores.match_scores.forEach (function (stage) {
      stage.stage_stagescores.forEach (function (score) {
        if (score.mod > newest)
          newest = score.mod;
      });
    });

    App.lastScore = newest.length ? 'Last score at ' + App.timeFormatUTC (newest) : '(No scores available)';

    return newest;
  };

  //
  //  For each squad on each stage, find the first shot and last shot fired
  //  times so we can display when they started, when they finished, how long
  //  they took, the fastest shooters, slowest shooter, and average shooter.
  //  Right now we'll use what we get, but if someone shoots through, this is
  //  going to mess us up. We need to throw out the outliers at some point,
  //  but we need to determine what a reasonable window is, so we can account
  //  for really long stages, or stage malfunctions that stop the match for a
  //  while.
  //
  App.calculateSquadTimes = function (match_scores) {
    var squadTimes = {};

    for (var stageIndex = 0; stageIndex < match_scores.length; stageIndex++) {
      var stage = match_scores [stageIndex];

      stage.stage_stagescores.forEach (function (score) {
        var shooter = App.data.shootersByUID [score.shtr];

        if (shooter) {
          var squad = shooter.sh_sqd;

          if (!shooter.sh_del) {
            if (_.isUndefined (squadTimes [squad]))
              squadTimes [squad] = {};
            if (_.isUndefined (squadTimes [squad][stageIndex]))
              squadTimes [squad][stageIndex] = {
                first: '<unknown>',
                last: '<unknown>',
                min: 0,
                max: 0,
                avg: 0,
                times: []
              };

            squadTimes [squad][stageIndex].times.push ({
              scored: score.mod,
              time: _.sum (score.str)
            });

            // if (score.apen)
            //   alert (sprintf ('Shooter %s %s has additional penalties on stage %s', shooter.sh_fn, shooter.sh_ln, stage.stage_number));
          }
        }
      });
    }

    _.each (squadTimes, function (stage, squadKey) {
      _.each (stage, function (squad, stageKey) {
        var p = _.sortBy (squad.times, 'scored');

        p [0].delta = 0;
        p [0].fmt = '00:00';

        for (var i = 1; i < p.length; i++) {
          p [i].delta = moment.utc (p [i].scored).diff (moment.utc (p [i - 1].scored));
          p [i].format = moment (p [i].delta, 'x').format ('mm:ss');
        }

        squadTimes [squadKey][stageKey].times = p;
        squadTimes [squadKey][stageKey].first = moment.utc (_.first (p).scored).local ().format ('HH:mm:ss');
        squadTimes [squadKey][stageKey].last = moment.utc (_.last (p).scored).local ().format ('HH:mm:ss');

        squadTimes [squadKey][stageKey].min = moment (
          (_.chain (p)
            .filter (function (n) {
              return n.delta > 0;
            })
            .min ('delta')
            .value ()).delta)
          .format ('m:ss');

        squadTimes [squadKey][stageKey].max = moment ((_.max (p, 'delta')).delta, 'x').format ('m:ss');
        squadTimes [squadKey][stageKey].avg = moment (_.sum (p, 'delta') / p.length, 'x').format ('m:ss');
      });
    });

    return squadTimes;
  };

  //
  //  Find deleted and DQ'ed shooters and remove them from the shooters
  //  list. We only indicate the number of DQs and deleted shooters, so
  //  we don't need to keep them around.
  //
  App.removeUnwanted = function (shooters)
  {
    var d = App.data;

    shooters.forEach (function (s) {
      if (s.sh_del) {
        s.sh_sqd = -1;
        d.deleted++;
        d.deletedList [s.sh_pos] = s;
      }
      else if (s.sh_dq) {
        s.sh_sqd = -1;
        d.dq++;
        d.dqList [s.sh_pos] = s;
      }
      /*
      else if (unwantedCompetitors.indexOf (s.sh_pos)) {
        s.sh_sqd = -1;
        d.filtered++;
      }
      else if (unwantedSquads.indexOf (s.sh_sqd)) {
        s.sh_sqd = -1;
        d.filtered++;
      }
      */
    });

    for (var i = shooters.length - 1; i >= 0; i--)
      if (shooters [i].sh_sqd === -1)
        shooters.splice (i, 1);
  };

  //
  //  Creates a hash with the key being the squad number and the value being an
  //  array of references to the shooters on that squad.
  //
  App.getSquadsWithShooters = function (shooters) {
    var squads = {};

    for (var i = 0; i < shooters.length; i++)
      if (!squads [shooters [i].sh_sqd])
        squads [shooters [i].sh_sqd] = [shooters [i]];
      else
        squads [shooters [i].sh_sqd].push (shooters [i]);

    return squads;
  };

  //
  //  Returns a sorted array of the squad numbers in use
  //
  App.getSquads = function (squadsWithShooters) {
    return _.map (_.keys (squadsWithShooters), function (k) { return Number (k); }).sort (function (a, b) { return a - b; });
  };

  //
  //  Creates a hash with the key being the UID of a shooter, and a reference
  //  to the shooter record.
  //
  App.getShootersByUID = function (shooters) {
    var uidList = {};

    _.map (shooters, function (s) {uidList [s.sh_uid] = s;});

    return uidList;
  };

  //
  //  Creates a hash with a key of the stage number, and a hash with a key of
  //  of squad number, pointing to a hash.  This last hash contains the data
  //  we need to render each cell (X/Y, hover text, etc). Preset the 'missing'
  //  element as a copy of the shooters in this squad.
  //
  App.createArray = function (squadList, numberOfStages) {
    var arr = {};

    for (var stageIndex = 0; stageIndex < numberOfStages; stageIndex++) {
      arr [stageIndex] = {};
      for (var squadIndex = 0; squadIndex < squadList.length; squadIndex++) {
        var squadNumber = squadList [squadIndex];

        arr [stageIndex][squadNumber] = {
          wanted: App.data.squadsWithShooters [squadNumber].length,
          found: 0,
          complete: [],
          missing: _.clone (App.data.squadsWithShooters [squadNumber]),
          dnf: [],
          dataerror: [],
          id: '#total-r' + squadNumber + '-c' + (stageIndex + 1),
          td_id: '#td-r' + squadNumber + '-c' + (stageIndex + 1),
          nextSquad: squadList [(squadIndex + 1) % squadList.length],
          prevSquad: squadList [squadIndex ? (squadIndex - 1) : (squadList.length - 1)],
          nextStage: (stageIndex + 1) % numberOfStages,
          prevStage: stageIndex ? (stageIndex - 1) : (numberOfStages - 1),
        };
      }
    }

    return arr;
  };

  //
  //  This will populate 'arr' with scores that are complete and also those
  //  marked as DNF. A second pass will be done later to populate the missing
  //  scores.
  //
  App.populateMatrix = function (matchData) {
    var match_scores = matchData.s.match_scores;

    var ffunction = function (stageIndex, score, shooter) {
      var arrayEntry = App.data.arr [stageIndex][shooter.sh_sqd];

      pmelib.shooterScored (score, function (scoreStatus) {
        switch (scoreStatus) {
          case 0: // no score
            break;
          case 1: // time only score
          case 2: // points only score
          case 3: // time + points score
            try {
              arrayEntry.missing.splice (arrayEntry.missing.indexOf (shooter), 1);
              arrayEntry.complete.push (shooter);
              arrayEntry.found++;
            } catch (e) {
              alert ('Unhandled error message: ' + e.message);
              return;
            }
            break;
          case 4: // dnf
            arrayEntry.missing.splice (arrayEntry.missing.indexOf (shooter), 1);
            arrayEntry.dnf.push (shooter);
            arrayEntry.found++;
            App.data.dnf++;
            break;
          case 5: // zero time
            shooter.sh_zts = shooter.sh_zts || [];
            shooter.sh_zts [stageIndex] = stageIndex;
            App.data.zerotime++;
            App.data.zerotimeList [shooter.sh_pos] = shooter;
            break;
          case 6: // bad values
            console.log ('Shooter \'%s %s\'', shooter.sh_fn, shooter.sh_ln);
            console.log ('  Stage \'%s\'', matchData.m.match_stages [stageIndex].stage_name);
            console.dir (score);
            arrayEntry.missing.splice (arrayEntry.missing.indexOf (shooter), 1);
            arrayEntry.dataerror.push (shooter);
            arrayEntry.found++;
            App.data.dataerror++;
            break;
          default:
            break;
        }

        return false;
      });
    };

    for (var stageIndex = 0; stageIndex < match_scores.length; stageIndex++) {
      var stage = match_scores [stageIndex];

      for (var scoreIndex = 0; scoreIndex < stage.stage_stagescores.length; scoreIndex++) {
        var score = stage.stage_stagescores [scoreIndex];
        var shooter = App.data.shootersByUID [score.shtr];

        if (shooter === undefined) {
          App.data.deadscore++;
          continue;
        }

        ffunction (stageIndex, score, shooter);
      }
    }
  };

  App.updateLastScore = function (fragment) {
    var p = document.createElement ('p');
    var span = document.createElement ('span');

    span.innerHTML = App.lastScore;
    span.className = 'useInZoom';

    p.appendChild (span);
    p.id = 'lastScore';

    fragment.appendChild (p);
  };

  //
  //
  //
  App.createTableHeader1st = function (stages) {
    var tr, th;

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    tr.appendChild (th);
    th = document.createElement ('th');
    th.colSpan = stages.length + 1;
    th.innerHTML = 'Stages';
    tr.appendChild (th);

    return tr;
  };

  App.createTableHeader2nd = function (stages) {
    var tr, th, span;

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Squads';
    tr.appendChild (th);

    for (var i = 0; i < stages.length; i++) {
      th = document.createElement ('th');
      span = document.createElement ('span');
      span.title = stages [i].stage_name;
      span.innerHTML = stages [i].stage_number;
      th.appendChild (span);
      tr.appendChild (th);
    }

    th = document.createElement ('th');
    th.innerHTML = 'Total';
    tr.appendChild (th);

    return tr;
  };

  App.createTableRow = function (squadNumber, numberOfStages) {
    var tr, td, span;

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.innerHTML = squadNumber;
    tr.appendChild (td);

    for (var stageNumber = 1; stageNumber <= numberOfStages; stageNumber++) {
      td = document.createElement ('td');
      span = document.createElement ('span');
      span.id = 'total-r' + squadNumber + '-c' + stageNumber;
      td.id = 'td-r' + squadNumber + '-c' + stageNumber;
      td.appendChild (span);
      tr.appendChild (td);
    }

    td = document.createElement ('td');
    span = document.createElement ('span');
    span.id = 'total-r' + squadNumber;
    td.appendChild (span);
    tr.appendChild (td);

    return tr;
  };

  App.createTableTotal = function (numberOfStages) {
    var tr, td, span;

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.innerHTML = 'Total';
    tr.appendChild (td);

    for (var stageNumber = 1; stageNumber <= numberOfStages; stageNumber++) {
      td = document.createElement ('td');
      span = document.createElement ('span');
      span.id = 'total-c' + stageNumber;
      td.appendChild (span);
      tr.appendChild (td);
    }

    td = document.createElement ('td');
    span = document.createElement ('span');
    span.id = 'total-match';
    td.appendChild (span);
    tr.appendChild (td);

    return tr;
  };

  App.createTable = function (fragment, squadList, stages) {
    var tableFragment = document.createDocumentFragment ();
    var table = document.createElement ('table');
    var tbody = document.createElement ('tbody');

    table.id = 'progressTable';
    table.className = 'useInZoom';

    tableFragment.appendChild (App.createTableHeader1st (stages));
    tableFragment.appendChild (App.createTableHeader2nd (stages));

    for (var i = 0; i < squadList.length; i++)
      tableFragment.appendChild (App.createTableRow (squadList [i], stages.length));

    tableFragment.appendChild (App.createTableTotal (stages.length));

    tbody.appendChild (tableFragment);
    table.appendChild (tbody);

    fragment.appendChild (table);
  };

  //
  //  App.data.arr contains complete, dnf and missing lists. Now create the
  //  HTML to stuff into the table cells. This has to be done after the
  //  fragment that was created is appended to the DOM, because getElementById
  //  (and the jQuery equivalent) won't work on fragments.
  //
  App.updateProgressTable = function () {
    var squadScores = {};
    var arr = App.data.arr;
    var stageKeys = _.keys (arr);
    var stageIndex;
    var squadKeys;
    var squadIndex;
    var matchScoresFound = 0;
    var matchScoresWanted = 0;

    function num4places (n) {
      return n.toFixed (0);
    }

    for (stageIndex = 0; stageIndex < stageKeys.length; stageIndex++) {
      var stage = arr [stageIndex];
      var stageScoresFound = 0;
      var stageScoresWanted = 0;

      for (squadIndex = 0, squadKeys = _.keys (stage); squadIndex < squadKeys.length; squadIndex++) {
        var squad = squadKeys [squadIndex];
        var arrayEntry = stage [squad];
        var wanted = arrayEntry.wanted;
        var found = arrayEntry.complete.length + arrayEntry.dnf.length + arrayEntry.dataerror.length;
        var text = num4places (wanted ? ((found / wanted) * 100) : 0) + '% complete';

        stageScoresFound += found;
        stageScoresWanted += wanted;

        if (squadScores [squad] === undefined)
          squadScores [squad] = {'found': found, 'wanted': wanted, 'id': '#total-r' + squad};
        else {
          squadScores [squad].found += found;
          squadScores [squad].wanted += wanted;
        }

        if (found) {
          text += "\n\n1st score: " + App.data.squadTimes [+squad][stageIndex].first;
          text += "\nLast score: " + App.data.squadTimes [+squad][stageIndex].last;

          text += "\n\nMin: " + App.data.squadTimes [+squad][stageIndex].min;
          text += "\nMax: " + App.data.squadTimes [+squad][stageIndex].max;
          text += "\nAvg: " + App.data.squadTimes [+squad][stageIndex].avg;
        }

        $(arrayEntry.id).text (found + '/' + arrayEntry.wanted).attr ('title', text);

        matchScoresFound += found;
        matchScoresWanted += wanted;
      }

      $('#total-c' + (stageIndex + 1)).text (stageScoresFound + '/' + stageScoresWanted).attr ('title', num4places (stageScoresWanted ? ((stageScoresFound / stageScoresWanted) * 100) : 0) + '% complete');
    }

    //
    //  Updates Total column (far right);
    //
    for (squadKeys = _.keys (squadScores), squadIndex = 0; squadIndex < squadKeys.length; squadIndex++) {
      var s = squadScores [squadKeys [squadIndex]];

      $(s.id).text (s.found + '/' + s.wanted).attr ('title', num4places (s.wanted ? ((s.found / s.wanted) * 100) : 0) + '% complete');
    }

    $('#total-match').text (matchScoresFound + '/' + matchScoresWanted).attr ('title', num4places (matchScoresWanted ? ((matchScoresFound / matchScoresWanted) * 100) : 0) + '% complete');
  };

  App.overrideDefaultCSS = function (uiConfig) {
    $('.progress-none').css ('background-color', uiConfig.progressColorEmpty);
    $('.progress-inprogress').css ('background-color', uiConfig.progressColorProgress);
    $('.progress-complete').css ('background-color', uiConfig.progressColorComplete);
    $('.progress-complete-with-dnf').css ('background-color', uiConfig.progressColorCompleteDNF);
    $('.progress-warn').css ('background-color', uiConfig.progressColorCompleteMissing);
    $('.progress-error').css ('background-color', uiConfig.progressColorError);
  };

  //
  //  Can't do this until we have all the percentages and entries in the table,
  //  because we have to look at our neighbors to determine how to color it.
  //
  App.colorizeProgressTable = function (squadList) {
    var arr = App.data.arr;
    var stageKeys = _.keys (arr);

    for (var squadIndex = 0; squadIndex < squadList.length; squadIndex++) {
      var squad = squadList [squadIndex];

      for (var stageIndex = 0; stageIndex < stageKeys.length; stageIndex++) {
        var arrayEntry = arr [stageIndex][squad];
        var cell = $(arrayEntry.id).parent ();

        if (arrayEntry.found === 0)
          cell.attr ('class', 'progress-none');
        else if (arrayEntry.found === arrayEntry.wanted)
          cell.attr ('class', arrayEntry.dataerror.length ? 'progress-error' : arrayEntry.dnf.length ? 'progress-complete-with-dnf' : 'progress-complete');
        else if (arrayEntry.found) {
          var nextFound  = arr [arrayEntry.nextStage][squad].found;
          var nextWanted = arr [arrayEntry.nextStage][squad].wanted;
          var prevFound  = arr [arrayEntry.prevStage][squad].found;
          var prevWanted = arr [arrayEntry.prevStage][squad].wanted;
          var classValue = 'progress-warn';

          if (stageKeys.length === 1)
            classValue = 'progress-inprogress';
          else if (stageKeys.length === 2) {
            if ((stageIndex === 0) && ((nextFound === 0) || (nextFound === nextWanted)))
              classValue = 'progress-inprogress';
            if ((stageIndex === 1) && ((prevFound === 0) || (prevFound === prevWanted)))
              classValue = 'progress-inprogress';
          }
          else if (((prevFound === 0) || (prevFound === prevWanted)) && ((nextFound === 0) || (nextFound === nextWanted)))
            classValue = 'progress-inprogress';

          cell.attr ('class', classValue);
        } else
          cell.attr ('class', 'progress-none');
      }
    }
  };

  //
  //
  //
  App.updateSummaryLine = function (fragment) {
    var things = [];

    if (App.data.deleted)
      if (App.urlParms.kiosk)
        things.push (App.data.deleted + ' deleted');
      else
        things.push ('<span id="popup-deleted" class="table-sorter-force-link"><a href="#">' + App.data.deleted + ' deleted</a></span>');

    if (App.data.dq)
      if (App.urlParms.kiosk)
        things.push (App.data.dq + " DQ'ed");
      else
        things.push ('<span id="popup-dq" class="table-sorter-force-link"><a href="#">' + App.data.dq + " DQ'ed</a><span>");

    if (App.data.zerotime)
      things.push ('<span id="popup-zerotime" class="table-sorter-force-link"><a href="#">' + App.data.zerotime + ' zero time</a><span>');

    if (App.data.dataerrors)
      things.push ('<span id="popup-dataerrors" class="table-sorter-force-link"><a href="#">' + App.data.dataerrors + ' zero time</a><span>');

    if (things.length) {
      var p = document.createElement ('p');
      var span = document.createElement ('span');

      span.innerHTML = things.join (', ') + ' competitors not included.';
      span.className = 'useInZoom';

      p.appendChild (span);
      p.id = 'summaryLine';

      fragment.appendChild (p);
    }
  };

  App.addHintLine = function (fragment) {
    var p = document.createElement ('p');

    p.innerHTML = '(Hover mouse over cells for stage names, percent complete)';
    p.id = 'hintLine';

    fragment.appendChild (p);
  };

  //
  //
  //
  App.getNames = function (shooters) {
    if (shooters.length)
      return _.map (shooters, function (obj) { return obj.sh_ln + ', ' + obj.sh_fn; }).sort ().join ('<br>');

    return '(None)';
  };

  App.addClickListeners = function () {
    $('#progressTable').off ().click (function (e) {
      var rowColumn = /^total-r(\d+)-c(\d+)$/.exec (e.target.id);

      if (rowColumn) {
        var squad = rowColumn [1];
        var stage = rowColumn [2];
        var arrayEntry = App.data.arr [stage - 1][squad];

        e.preventDefault ();

        $('#popup-content-complete').html (App.getNames (arrayEntry.complete));
        $('#popup-content-dnf-header').toggle (arrayEntry.dnf.length !== 0);
        $('#popup-content-dnf').html (App.getNames (arrayEntry.dnf));
        $('#popup-content-dnf').toggle (arrayEntry.dnf.length !== 0);
        $('#popup-content-error-header').toggle (arrayEntry.dataerror.length !== 0);
        $('#popup-content-error').html (App.getNames (arrayEntry.dataerror));
        $('#popup-content-error').toggle (arrayEntry.dataerror.length !== 0);
        $('#popup-content-missing').html (App.getNames (arrayEntry.missing));
        $('#popup').dialog ({
          width: 'auto',
          title: 'Squad ' + squad + ', Stage ' + stage,
          dialogClass: 'no-close',
          modal: true,
          draggable: true,
          resizable: false,
          buttons: [
            {
              text: 'Close',
              click: function () {
                $(this).dialog ('close');
              }
            }
          ],
        });
      }
    });

    if (App.data.deleted) {
      $('#popup-deleted').off ().click (function (e) {
        var newRows = '';

        e.preventDefault ();

        _.each (_.sortBy (App.data.deletedList, function (s) {
          return s.sh_ln + ', ' + s.sh_fn;
        }), function (s) {
          newRows = newRows +
            '<tr>' +
              '<td>' + s.sh_pos + '</td>' +
              '<td>' + s.sh_ln + ', ' + s.sh_fn + '</td>' +
              '<td>' + (s.sh_id ? s.sh_id : '--') + '</td>' +
            '</tr>';
        });

        $('#popup-content-table-deleted > tbody').empty ().append (newRows);

        $('#popupDeleted').dialog ({
          width: 'auto',
          title: 'Deleted Competitors',
          dialogClass: 'no-close',
          modal: true,
          draggable: true,
          resizable: false,
          buttons: [
            {
              text: 'Close',
              click: function () {
                $(this).dialog ('close');
              }
            }
          ],
        });
      });
    }

    if (App.data.dq) {
      $('#popup-dq').off ().click (function (e) {
        var newRows = '';

        e.preventDefault ();

        _.each (_.sortBy (App.data.dqList, function (s) {
          return s.sh_ln + ', ' + s.sh_fn;
        }), function (s) {
          newRows = newRows +
            '<tr>' +
              '<td>' + s.sh_pos + '</td>' +
              '<td>' + s.sh_ln + ', ' + s.sh_fn + '</td>' +
              '<td>' + (s.sh_id ? s.sh_id : '--') + '</td>' +
              '<td>' + App.timeFormatUTC (s.mod_dq) + '</td>' +
            '</tr>';
        });

        $('#popup-content-table-dq > tbody').empty ().append (newRows);

        $('#popupDQ').dialog ({
          width: 'auto',
          title: 'DQ\'ed Competitors',
          dialogClass: 'no-close',
          modal: true,
          draggable: true,
          resizable: false,
          buttons: [
            {
              text: 'Close',
              click: function () {
                $(this).dialog ('close');
              }
            }
          ],
        });
      });
    }

    if (App.data.zerotime) {
      $('#popup-zerotime').off ().click (function (e) {
        var newRows = '';

        e.preventDefault ();

        _.each (_.sortBy (App.data.zerotimeList, function (s) {
          return s.sh_ln + ', ' + s.sh_fn;
        }), function (s) {
          newRows = newRows +
            '<tr>' +
              '<td>' + s.sh_pos + '</td>' +
              '<td>' + s.sh_ln + ', ' + s.sh_fn + '</td>' +
              '<td>' + (s.sh_id ? s.sh_id : '--') + '</td>' +
              '<td>' + s.sh_zts.filter (Number).join (',') + '</td>' +
            '</tr>';
        });

        $('#popup-content-table-zerotime > tbody').empty ().append (newRows);

        $('#popupZerotime').dialog ({
          width: 'auto',
          title: 'Zero-time Competitors',
          dialogClass: 'no-close',
          modal: true,
          draggable: true,
          resizable: false,
          buttons: [
            {
              text: 'Close',
              click: function () {
                $(this).dialog ('close');
              }
            }
          ],
        });
      });
    }

    if (App.data.dataerrors) {
      $('#popup-dataerrors').off ().click (function (e) {
        var newRows = '';

        e.preventDefault ();

        _.each (_.sortBy (App.data.dataerrorsList, function (s) {
          return s.sh_ln + ', ' + s.sh_fn;
        }), function (s) {
          newRows = newRows +
            '<tr>' +
              '<td>' + s.sh_pos + '</td>' +
              '<td>' + s.sh_ln + ', ' + s.sh_fn + '</td>' +
              '<td>' + (s.sh_id ? s.sh_id : '--') + '</td>' +
              '<td>' + s.sh_zts.filter (Number).join (',') + '</td>' +
            '</tr>';
        });

        $('#popup-content-table-dataerrors > tbody').empty ().append (newRows);

        $('#popupDataerrors').dialog ({
          width: 'auto',
          title: 'Competitors With Bad Data',
          dialogClass: 'no-close',
          modal: true,
          draggable: true,
          resizable: false,
          buttons: [
            {
              text: 'Close',
              click: function () {
                $(this).dialog ('close');
              }
            }
          ],
        });
      });
    }
  };

  //
  //
  //
  App.addFlare = function () {
    var arr = App.data.arr;
    var stageKeys = _.keys (arr);
    var stageIndex;
    var squadKeys;
    var squadIndex;

    App.data_keep = App.data_keep || {};
    App.data_keep.previousCellValue = App.data_keep.previousCellValue || [];

    for (stageIndex = 0; stageIndex < stageKeys.length; stageIndex++) {
      var stage = arr [stageIndex];

      App.data_keep.previousCellValue [stageIndex] = App.data_keep.previousCellValue [stageIndex] || [];

      for (squadIndex = 0, squadKeys = _.keys (stage); squadIndex < squadKeys.length; squadIndex++) {
        var squad = squadKeys [squadIndex];
        var arrayEntry = stage [squad];
        var found = arrayEntry.complete.length + arrayEntry.dnf.length;
        var cellText = found + '/' + arrayEntry.wanted;

        if (App.data_keep.previousCellValue [stageIndex][squadIndex] !== cellText) {
          if (typeof App.data_keep.previousCellValue [stageIndex][squadIndex] !== 'undefined')
            $(arrayEntry.td_id).fadeTo (1, 0).fadeTo (600, 1);
          App.data_keep.previousCellValue [stageIndex][squadIndex] = cellText;
        }
      }
    }
  };

  //
  //
  //
  App.errorMessage = function (msg) {
    var p = document.createElement ('p');
    p.innerHTML = msg;
    p.id = 'errorMessage';
    $('#progress').empty ().append (p).show ();
  };

  //
  //  We're received match data, so let's figure it out
  //
  App.updateProgress = function (matchData) {
    if (!matchData || !matchData.m || !matchData.m.match_stages || !matchData.m.match_stages.length)
      return App.errorMessage ("(No stages present)");

    if (!matchData || !matchData.s || !matchData.s.match_scores || !matchData.s.match_scores.length)
      return App.errorMessage ("(No scores present)");

    $('#matchname').text (matchData.m.match_name);

    var fragment = document.createDocumentFragment ();

    App.initializeVariables ();
    App.findNewestScore (matchData.s);
    App.removeUnwanted (matchData.m.match_shooters);
    App.data.squadsWithShooters = App.getSquadsWithShooters (matchData.m.match_shooters);
    App.data.squadList = App.getSquads (App.data.squadsWithShooters);
    App.data.shootersByUID = App.getShootersByUID (matchData.m.match_shooters);
    App.data.squadTimes = App.calculateSquadTimes (matchData.s.match_scores);
    App.data.arr = App.createArray (App.data.squadList, matchData.m.match_stages.length);
    App.populateMatrix (matchData);
    App.updateLastScore (fragment);
    App.createTable (fragment, App.data.squadList, matchData.m.match_stages);
    App.updateSummaryLine (fragment);

    if (!App.urlParms.kiosk)
      App.addHintLine (fragment);

    $('#progress').empty ().append (fragment).hide ();

    App.updateProgressTable ();
    App.colorizeProgressTable (App.data.squadList);
    App.overrideDefaultCSS (matchData.c._ui);

    $('#progress').show ();

    if (!App.urlParms.kiosk) {
      App.addClickListeners ();

      if (matchData.c._ui.progressFlare)
        App.addFlare ();
    }

    //
    //  Must .show () first, otherwise zoom won't be calculated correctly. Make
    //  sure current zoom is reset so widths are correct.
    //
    if (App.urlParms.kiosk) {
      var maxWidth = 0;

      $('#section,#matchname,#jqxMenu').hide ();
      $('#content').css ('zoom', 1);
      $('.useInZoom').each (function () {
        maxWidth = _.max ([maxWidth, $(this).width ()]);
      });
      $('#content').css ('zoom', _.min ([$(window).width () / (maxWidth + 30), $(window).height () / $('#content').height ()]));
    }
  };

  //
  //
  //
  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.getMatchData ();
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.getMatchData = function () {
    App.socket.emit ('match:get', {options: {config: true, match: true, scores: true}}, function (data) {
      App.updateProgress (data.matchData);
    });
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/manage/progress';
  };

  //
  //  'Main'
  //
  App.urlParms = pmelib.queryString ();

  if (App.urlParms.kiosk) {
    window.pmeModule = window.pmeModule || {name: 'progress'};
    window.pmeModule.enableKiosk = function () {
      App.socket.on ('kiosk_page', function (param) {
        if (param.url)
          window.location.href = param.url;
      });
    };
  }

  //
  //  Ye olde main...
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.getMatchData);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Manage->Match Progress'});

  window.onerror = function (msg, url, line, col, error) {
    if (App.socket) {
      App.socket.emit ('errorlog:error', {
        msg: msg,
        url: url,
        line: line,
        col: col,
        stack: error.stack,
      });
    } else {
      alert ('An internal error has occurred. Please check the javascript console for errors');
    }

    return false;
  };
});
