/* jshint devel:true */
/* global io, pmelib */
/* global console:false, _:false */
/* jshint eqnull:true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.matchData = {};
  App.matchDivisions = [];
  App.quickFind = {};
  App.scoresDataAdapters = {};
  App.scores = {};
  App.urlParms = '';
  App.sortMap = {
    900000: '(Eeek!)', // No shooter with matching UID
    800000: '(DEL)',   // Shooter is deleted
    700000: '--',      // DQ
    600000: 'DNF',     // DNF
    500000: '<span style="color: red;">ERROR</span>',   // Penalties < 30 seconds and no raw time
    400000: '<span style="color: red;">INCMPLT</span>', // Incomplete (missing string times)
  };

  var upperCaseOnly = function (n) {
    return !/[^A-Z]/.test (n);
  };

  //
  //
  //
  App.createScoresDataAdapter = function (id) {
    var source = {
      localdata: [],
      datatype: 'json',
      datafields: [
        { name: '_place',     type: 'number' },
        { name: '_name',      type: 'string' },
        { name: '_scsa',      type: 'string' },
        { name: '_class',     type: 'string' },
        { name: '_division',  type: 'string' },
        { name: '_age',       type: 'string' },
        { name: '_lady',      type: 'string' },
        { name: '_military',  type: 'string' },
        { name: '_law',       type: 'string' },
        { name: '_foreign',   type: 'string' },
        { name: '_total',     type: 'string' },
        { name: '_sort',      type: 'float'  },
        { name: '_worst_raw', type: 'number' },
        { name: '_worst_pen', type: 'number' },
      ],
      sort: function (column, direction) {
        var _adapter = App.scoresDataAdapters [id];
        var _data = _adapter.source.localdata;

        if (direction === 'ascending')
          direction = true;
        else if (direction === 'descending')
          direction = false;

        if (direction === null) {
          column = '_place';
          direction = true;
        }

        if (column === '_total')
          column = '_sort';

        _data = _.sortBy (_data, function (score) {
          if (!_.isUndefined (score [column]))
            return score [column];
          else if (!_.isUndefined (score._extra [column]))
            return score._extra [column];
          else
            alert ('Eeek! Can\'t find sort column \'' + column + '\'');
        });

        if (direction === false)
          _data.reverse ();

        _adapter.source.localdata = _data;

        $('#' + id).jqxGrid ('updatebounddata', 'sort');
      },
      addrow: function (rowid, newdata, position, commit) {
        commit (true);
      },
    };

    source.datafields = source.datafields.concat (App.cached.datafields);

    var adapter = new $.jqx.dataAdapter (source);

    App.scoresDataAdapters [id] = {
      adapter: adapter,
      source: source
    };

    return adapter;
  };

  //
  //  Creates the menu grid and all the stage/division/combined grids. Does
  //  NOT require the scores to be calculated beforehand.
  //
  App.createScoresGrids = function () {
    var menuGridColumns = [];
    var widest = 0;
    var totalWidth = 0;
    var scoresSource = {
      datatype: 'array',
      localdata: [],
    };

    //
    //  Add the _extra fields so we can store either the time from each stage
    //  (for combined overall and combined by division), or the raw time and
    //  penalties (for stage combined, or stage by division).  The scores
    //  calculation routine will load these appropriately, and the grid columns
    //  field will have the appropriate references added. To know how many to
    //  add, we take the larger of the stage with the highest number of strings
    //  * 2 (raw, pen), or the number of stages.
    //
    if (!App.cached) {
      App.cached = {};
      App.cached.numberOfStages = App.matchData.m.match_stages.length;
      App.cached.mostStrings = _.max (_.map (App.matchData.m.match_stages, function (stage) {return stage.stage_strings;})) * 2;
      App.cached.extraColumns = _.max ([App.cached.numberOfStages, App.cached.mostStrings]);
      App.cached.datafields = _.map (_.times (App.cached.extraColumns), function (index) {
        return {
          name: '_' + index,
          type: 'float',
          map:  '_extra>' + '_' + index,
        };
      });
    }

    // FIXME: create a real UUID
    _.each ([{stage_name: '', stage_uuid: 'notarealuuid'}].concat (App.matchData.m.match_stages), function (stage) {
      widest = _.max ([pmelib.getWidthOfText (stage.stage_name) + 6, widest]);
      scoresSource.localdata.push (_.merge ({
          stage_uuid: stage.stage_uuid,
          stage_strings: stage.stage_strings,
          stage: stage.stage_name,
          REVIEW: stage.stage_name.length ? 'Review' : '',
          COMBINED: 'Combined',
        },
        App.matchDivisionsLong)
      );
    });

    _.each (_.merge ({
        stage: 'Stage',
        REVIEW: 'Review',
        COMBINED: 'Combined',
      }, App.matchDivisionsLong), function (value, key) {
        menuGridColumns.push ({
          text: value,
          datafield: key,
          align: 'center',
          cellsalign: 'center',
          width: pmelib.getWidthOfText (value) + 6,
        });
      }
    );

    _.find (menuGridColumns, {text: 'Stage'}).width = widest;

    totalWidth = _.sum (menuGridColumns, function (col) {
      return col.width;
    });

    var scoresMenuAdapter = new $.jqx.dataAdapter (scoresSource, {
      loadComplete: function (records) {
        var topFragment = document.createDocumentFragment ();
        var px;
        var commonFields = {
          '_place':    { header: 'Place',      longest: '', length: 0, pxwidth: 0, extra: {
              cellsalign: 'right',
              filtercondition: 'equal'
            }
          },
          '_name':     { header: 'Name',       longest: '', length: 0, pxwidth: 0, },
          '_scsa':     { header: 'SCSA',       longest: '', length: 0, pxwidth: 0, },
          '_class':    { header: 'Class',      longest: '', length: 0, pxwidth: 0, },
          '_division': { header: 'Division',   longest: '', length: 0, pxwidth: 0, },
          '_age':      { header: 'Age',        longest: '', length: 0, pxwidth: 0, },
          '_lady':     { header: 'Lady',       longest: '', length: 0, pxwidth: 0, },
          '_military': { header: 'Military',   longest: '', length: 0, pxwidth: 0, },
          '_law':      { header: 'Law',        longest: '', length: 0, pxwidth: 0, },
          '_foreign':  { header: 'Foreign',    longest: '', length: 0, pxwidth: 0, },
          '_total':    { header: 'Total Time', longest: '', length: 0, pxwidth: 0, extra: {
              cellsrenderer: function (row, field, value, html, properties, score) {
                return '<div class="total" style="margin-right: 6px; text-align: right;">' +
                ((score._sort >= 100000) ? '--' : ((Math.round (value * 100)) / 100).toFixed (2)) +
                '</div>';
              },
            },
          },
        };
        var stageFields = {};
        _.times (App.matchData.m.match_stages.length, function (index) {
          stageFields ['_' + index] = {
            header: 'Stage #' + (index + 1),
            longest: '',
            length: 0,
            pxwidth: 0,
            extra: {
              rendered: function (element) {
                $(element).parent ().jqxTooltip ({
                  position: 'top-right',
                  content: App.matchData.m.match_stages [index].stage_name,
                });
              },
              cellsrenderer: function (row, field, value) {
                return '<div class="total" style="margin-right: 6px; text-align: right;">' +
                ((value >= 100000) ? (App.sortMap [value] || '--') : ((Math.round (value * 100)) / 100).toFixed (2)) +
                '</div>';
              },
            }
          };
        });
        var stringFields = {};
        _.times (App.cached.mostStrings, function (index) {
          var stage_num = Math.floor (index / 2) + 1;
          stringFields ['_' + index] = {
            header: ((index % 2) ? 'Pen #' : 'Raw #') + stage_num,
            longest: '',
            length: 0,
            pxwidth: 0,
            extra: {
              cellsrenderer: function (row, field, value, html, properties, score) {
                var val;
                var strike = '';

                if (score._sort >= 100000)
                  val = App.sortMap [score._sort] || '--';
                else {
                  strike = ((field === score._worst_raw) || (field === score._worst_pen)) ? 'text-decoration: line-through;' : '';
                  val = ((Math.round (value * 100)) / 100).toFixed (2);
                }

                return '<div class="total" style="margin-right: 6px; text-align: right;' + strike + '">' + val + '</div>';
              },
            }
          };
        });
        var reviewFields = {
          '_name':     { header: 'Name',       longest: '', length: 0, pxwidth: 0, },
          '_class':    { header: 'Class',      longest: '', length: 0, pxwidth: 0, },
          '_division': { header: 'Division',   longest: '', length: 0, pxwidth: 0, },
        };
        var overallFields = _.merge ({}, commonFields, stageFields);
        var scoresFields = _.merge ({}, commonFields, stringFields);

        var calculateLengths = function (fields) {
          _.each (fields, function (fieldValue, fieldKey) {
            fields [fieldKey].longest = fields [fieldKey].header;
            fields [fieldKey].length = fields [fieldKey].header.length;
            fields [fieldKey].pxwidth = pmelib.getWidthOfText (fields [fieldKey].longest) + 6;
          });

          _.each (App.matchData.m.match_shooters, function (shooter) {
            _.each (_.keys (fields), function (fieldKey) {
              if (shooter [fieldKey] && (shooter [fieldKey].length >= fields [fieldKey].length)) {
                if ((px = pmelib.getWidthOfText (shooter [fieldKey]) + 6) > fields [fieldKey].pxwidth) {
                  fields [fieldKey].longest = shooter [fieldKey];
                  fields [fieldKey].length = shooter [fieldKey].length;
                  fields [fieldKey].pxwidth = px;
                }
              }
            });
          });
        };

        calculateLengths (overallFields);
        calculateLengths (scoresFields);
        calculateLengths (reviewFields);

        _.each (records, function (row) {
          _.each (_.filter (_.keys (row), upperCaseOnly), function (section) {
            var isOverall = !row.stage.length;
            var isReview = (section === 'REVIEW') ? true : false;
            var fields = isReview ? reviewFields : (isOverall ? overallFields : scoresFields);
            var sectionDiv = document.createElement ('div');
            var headerH3 = document.createElement ('h3');
            var gridDiv = document.createElement ('div');
            var textDiv = document.createElement ('div');
            var spacerP = document.createElement ('p');
            var button = document.createElement ('input');
            var idDiv = 'section-' + row.stage_uuid + '-' + section;
            var idGrid = idDiv + '-grid';

            if (!isReview && !isOverall)
              for (var i = row.stage_strings * 2; i < App.cached.mostStrings * 2; i++)
                delete fields ['_' + i];

            sectionDiv.id = idDiv;
            sectionDiv.style.cssText = 'display: none; margin: 0 auto; text-align: center;';

            headerH3.innerHTML = (row.stage.length ? row.stage : '(All Stages)') + ' -- ' + row [section];
            headerH3.style.cssText = 'margin-top: 0;';

            gridDiv.id = idGrid;
            gridDiv.style.cssText = 'margin: 0 auto; text-align: center;';
            gridDiv.setAttribute ('stage-strings', row.stage_strings);

            button.type = 'button';
            button.value = 'Back';
            button.setAttribute ('previous-button', idDiv);

            textDiv = document.createElement ('div');
            textDiv.style.cssText = 'text-align: center;';
            textDiv.appendChild (spacerP);
            textDiv.appendChild (button);

            sectionDiv.appendChild (headerH3);
            sectionDiv.appendChild (gridDiv);
            sectionDiv.appendChild (textDiv);
            topFragment.appendChild (sectionDiv);

            $(gridDiv).jqxGrid ({
              width: _.sum (fields, 'pxwidth'),
              height: 100,
              autoheight: true,
              source: App.createScoresDataAdapter (idGrid),
              scrollmode: 'logical',
              altrows: true,
              // pageable: true,
              // filterable: true,
              // autoshowfiltericon: true,
              // showfilterrow: true,
              sortable: true,
              showsortmenuitems: false,
              selectionmode: 'none',
              enablehover: false,
              columns: _.map (fields, function (field, fieldName) {
                return _.merge ({
                  text: field.header,
                  width: field.pxwidth,
                  datafield: fieldName,
                  align: 'center',
                  cellsalign: 'center',
                }, field.extra || {});
              }),
            });
          });
        });

        $('#scoresGrids').empty ().append (topFragment).show ();
      }
    });

    $('#menuGrid').jqxGrid ({
      width: totalWidth,
      height: 100,
      autoheight: true,
      source: scoresMenuAdapter,
      scrollmode: 'logical',
      altrows: true,
      selectionmode: 'singlecell',
      columns: menuGridColumns,
    }).fadeIn ();

    $('#menuGrid').on ('cellselect', function (event) {
      var args = event.args;

      if ((args.datafield === 'stage') || ((args.datafield === 'REVIEW') && (args.rowindex === 0)))
        $('#menuGrid').jqxGrid ('unselectcell', args.rowindex, args.datafield);
      else {
        var idDiv =  '#section-' + $('#menuGrid').jqxGrid ('getrowdata', args.rowindex).stage_uuid + '-' + args.datafield;
        $('#menuGrid').fadeOut (200, function () {
          $(idDiv).fadeIn (200);
        });
      }
    });

    $('[previous-button]').jqxButton ({width: 65, theme: 'default'});
    $('[previous-button]').on ('click', function () {
      $('#' + $(this).attr ('previous-button')).fadeOut (200, function () {
        $('#menuGrid').fadeIn (200);
        $('#menuGrid').jqxGrid ('clearselection');
      });
    });
  };

  //
  //  Run through all the stages and shooters, calculating the scores for any
  //  scores that exist. Deleted shooters should already be removed, DQed
  //  shooters and DNFs return all 0's.
  //
  //  sh_scores[] contains the times for stage, with penalties already applied.
  //  The worst string has NOT been removed, nor have they been tested to see
  //  they're complete.
  //
  App.calculateScores = function (matchData) {
    var matchScoresByStageCombined = {};
    var matchScoresByStageByDivision = {};
    var matchScoresByDivisionAllStages = {};
    var finalscores = {};

    //
    //  Create all the structure indices
    //
    _.each (App.matchDivisions, function (division) {
      matchScoresByDivisionAllStages [division] = [];
    });

    _.each (matchData.m.match_stages, function (stage) {
      matchScoresByStageCombined [stage.stage_uuid] = [];
      matchScoresByStageByDivision [stage.stage_uuid] = {};
      _.each (App.matchDivisions, function (division) {
        matchScoresByStageByDivision [stage.stage_uuid][division] = [];
      });
    });

    //
    //  Now populate the structures
    //
    _.each (matchData.s.match_scores, function (stageScores) {
      var stage_uuid = stageScores.stage_uuid;
      var stage = App.quickFind.stages [stage_uuid];
      var temp_stagescores = {};

      //
      //  Because of a bug in the iOS version, it's possible for a shooter to
      //  have duplicated scores. In the array of stage_stagescores, the
      //  shooter may have two entries, where all the data except for the
      //  dname, udid, and mod fields are the same.
      //
      //  To fix this, we stuff all the scores into a hash, keyed by the shtr
      //  field. To be doubly sure, if the shtr key already exists in the hash,
      //  we'll use whichever one has a later mod field (in theory, newer is
      //  better). We could compare the str array, and if they're not the same,
      //  throw a warning.
      //
      _.each (stageScores.stage_stagescores, function (score) {
        if (temp_stagescores [score.shtr]) {
          if (!_.isEqual (score.str, temp_stagescores [score.shtr].str)) {
            alert ("Eeek! Duplicate score doesn't have identical string times!");
            console.log ('score -->');
            console.dir (score);
            console.log ('temp_stagescores [score.shtr] -->');
            console.dir (temp_stagescores [score.shtr]);
          }
          if (score.mod > temp_stagescores [score.shtr]) {
            console.log ('Replacing score with newer version: %s vs %s', score.mod, temp_stagescores [score.shtr].mod);
            temp_stagescores [score.shtr] = score;
          }
        } else
          temp_stagescores [score.shtr] = score;
      });

      _.each (temp_stagescores, function (score) {
        var shooter = App.quickFind.shooters [score.shtr];

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

        score._stage = stage;
        score._name = shooter._name + (shooter.sh_dq ? ' (DQ)' : '');
        score._scsa = shooter._scsa;
        score._class = shooter._class;
        score._division = shooter._division;
        score._age = shooter._age;
        score._lady = shooter._lady;
        score._military = shooter._military;
        score._law = shooter._law;
        score._foreign = shooter._foreign;
        score._worst_raw = (score._scores ? ('_' + ((score._scores.worst * 2) + 0)) : '');
        score._worst_pen = (score._scores ? ('_' + ((score._scores.worst * 2) + 1)) : '');
        score._extra = {};

        _.each (score.str, function (str, index) { score._extra ['_' + ((index * 2) + 0)] = str;});
        _.each (score._pensst, function (pensst, index) { score._extra ['_' + ((index * 2) + 1)] = pensst;});

        matchScoresByStageCombined [stage_uuid].push (_.cloneDeep (score));
        matchScoresByStageByDivision [stage_uuid][shooter.sh_dvp].push (_.cloneDeep (score));
        matchScoresByDivisionAllStages [shooter.sh_dvp].push (_.cloneDeep (score));
      });
    });

    //
    //  Now sort by total
    //
    finalscores.notarealuuid = {};
    finalscores.notarealuuid.COMBINED = [];

    _.each (matchScoresByStageCombined, function (stage, stage_uuid) {
      finalscores [stage_uuid] = {};
      finalscores [stage_uuid].COMBINED = _.map (_.sortBy (stage, function (score) {
        return score._sort;
      }), function (score, score_index) {
        _.each (score.str, function (str, str_index) { score._extra ['_' + ((str_index * 2) + 0)] = str;});
        _.each (score._pensst, function (pensst, pensst_index) { score._extra ['_' + ((pensst_index * 2) + 1)] = pensst;});
        score._place = score_index + 1;
        return score;
      });
    });

    _.each (matchScoresByStageByDivision, function (divisions, stage_uuid) {
      _.each (divisions, function (division, division_name) {
        finalscores [stage_uuid][division_name] = _.map (_.sortBy (division, function (score) {
          return score._sort;
        }), function (score, score_index) {
          score._place = score_index + 1;
          return score;
        });
      });
    });

    //
    //  These will be interleaved within the division, so
    //    PROD->[shooter #1 - stage #1
    //           shooter #2 - stage #1
    //           shooter #1 - stage #2
    //           shooter #2 - stage #2],
    //    OPEN->[shooter #1 - stage #1
    //           shooter #2 - stage #1
    //           shooter #1 - stage #2
    //           shooter #2 - stage #2],
    //    etc.
    //  We need to sort by shooter, then sum the stage total for each shooter,
    //  then create a single record. We only need shtr and total.
    //
    _.each (matchScoresByDivisionAllStages, function (division, division_name) {
      var shooter_uids = _.uniq (_.pluck (division, 'shtr'));
      var scores = {};

      _.each (shooter_uids, function (uid) {
        var stages = _.filter (division, {shtr: uid});
        var total = _.sum (stages, function (stage) {
          return stage._total;
        });
        if (scores [uid]) {
          alert ('Eeek! Why does this UUID already have a score?');
          /* jshint -W087 */
          debugger;
          /* jshint +W087 */
        } else {
          //
          //  We want all the _.* fields from the stage, so we get the
          //  shooter's name, division, class, etc.
          //
          var temp = _.pick (stages [0], function (v, k) {
            return k.substr (0, 1) === '_';
          });
          temp._total = total;
          temp._sort = total + _.max (_.map (stages, function (stage) {return (stage._sort >= 100000) ? stage._sort : 0;}));
          temp._stages = stages;
          scores [uid] = temp;
        }
      });

      finalscores.notarealuuid [division_name] = _.map (_.sortBy (scores, function (score) {
        return score._sort;
      }), function (score, score_index) {
        _.each (score._stages, function (stage, stage_index) {
          score._extra ['_' + stage_index] = stage._sort;
        });
        score._place = score_index + 1;
        return score;
      });

      finalscores.notarealuuid.COMBINED = finalscores.notarealuuid.COMBINED.concat (_.map (scores, function (v) {
        return _.cloneDeep (v);
      }));
    });

    finalscores.notarealuuid.COMBINED = _.map (_.sortBy (finalscores.notarealuuid.COMBINED, function (score) {
      return score._sort;
    }), function (score, score_index) {
      _.each (score._stages, function (stage, stage_index) {
        score._extra ['_' + stage_index] = stage._sort;
      });
      score._place = score_index + 1;
      return score;
    });

    return finalscores;
  };

  //
  //  The grids have been created, the adapters have been created, and the
  //  scores have been calculated. Now bind the scores data to the adapters,
  //  then assign the adapters to the grids.
  //
  App.bindScoresToAdapters = function () {
    var records = $('#menuGrid').jqxGrid ('getrows');

    _.each (records, function (stage) {
      _.each (_.filter (_.keys (stage), upperCaseOnly), function (section) {
        var idGrid = 'section-' + stage.stage_uuid + '-' + section + '-grid';
        var adapters = App.scoresDataAdapters [idGrid];

        adapters.source.localdata = App.scores [stage.stage_uuid][section];
        $('#' + idGrid).jqxGrid ({source: adapters.adapter});
      });
    });
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
  App.updateGrid = function () {
    App.socket.emit ('match:get', {options: {all: true}}, function (data) {
      App.matchData = data.matchData;

      $('#matchname').text (App.matchData.m.match_name);

      if (!App.matchData || !App.matchData.m || !App.matchData.m.match_shooters || !App.matchData.m.match_shooters.length)
        return App.errorMessage ('(No competitors present)');

      if (!App.matchData || !App.matchData.m || !App.matchData.m.match_stages || !App.matchData.m.match_stages.length)
        return App.errorMessage ('(No stages present)');

      if (!App.matchData || !App.matchData.s || !App.matchData.s.match_scores || !App.matchData.s.match_scores.length)
        return App.errorMessage ('(No scores present)');

      _.each (App.matchData.m.match_shooters, function (shooter) {
        shooter._name = shooter.sh_ln + ', ' + shooter.sh_fn;
        shooter._scsa = shooter.sh_id || '';
        shooter._class = App.matchData.l.classes [shooter.sh_grd] || shooter.sh_grd;
        shooter._division = App.matchData.l.divisions [shooter.sh_dvp] || shooter.sh_dvp;
        shooter._age = (shooter.sh_age !== 'ADULT') ? (App.matchData.l.ages [shooter.sh_age] || shooter.sh_age) : '';
        shooter._lady = (shooter.sh_gen === 'FEMALE') ? 'Y' : '';
        shooter._military = shooter.sh_mil ? 'Y' : '';
        shooter._law = shooter.sh_law ? 'Y' : '';
        shooter._foreign = shooter.sh_frn ? 'Y' : '';
      });

      console.time ('pmelib');
      pmelib.removeDeletedShooters (App.matchData);
      pmelib.removeDeletedStages (App.matchData);
      App.matchDivisions = pmelib.getMatchDivisions (App.matchData);
      App.matchDivisionsLong = pmelib.getMatchDivisionsLong (App.matchData);
      App.quickFind = pmelib.createQuickFindList (App.matchData, function (empty) {
        empty._scores = {
          worst_raw: -1,
          worst_pen: -1,
        };
        empty._place = 0;
        empty._total = 0;
        empty._sort = 300000;
      });
      console.timeEnd ('pmelib');

      console.time ('createScoresGrids');
      App.createScoresGrids ();
      console.timeEnd ('createScoresGrids');

      console.time ('calculateScores');
      App.scores = App.calculateScores (App.matchData);
      console.timeEnd ('calculateScores');

      console.time ('bindScoresToAdapters');
      App.bindScoresToAdapters ();
      console.timeEnd ('bindScoresToAdapters');
    });
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.updateGrid ();
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
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

  App.reload = function () {
    alert ('New match loaded, reloading scores page!');
    window.location.href = 'http://' + window.location.host + '/edit/scores';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.updateGrid);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {'msg': 'View/Edit->Scores (SC)'});
});
