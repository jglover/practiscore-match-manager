/* jshint devel:true */
/* global io, pmelib */
/* global console:false, sprintf:false, _:false */
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

  var menuGrid = $('#menuGrid');

  var upperCaseOnly = function (n) {
    return !/[^A-Z]/.test (n);
  };

  var shooterSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: '_nameuspsa', type: 'string' },
      { name: 'sh_uid',     type: 'string' }
    ],
  };

  var shooterAdapter = new $.jqx.dataAdapter (shooterSource);

  var individualResultsSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: '_stage',      type: 'string' },
      { name: '_a',          type: 'number' },
      { name: '_b',          type: 'number' },
      { name: '_c',          type: 'number' },
      { name: '_d',          type: 'number' },
      { name: '_m',          type: 'number' },
      { name: '_npm',        type: 'number' },
      { name: '_steel',      type: 'string' },
      { name: '_paperp',     type: 'number' },
      { name: '_steelp',     type: 'number' },
      { name: '_mp',         type: 'number' },
      { name: '_nsp',        type: 'number' },
      { name: '_procp',      type: 'number' },
      { name: '_time',       type: 'float'  },
      { name: '_hf',         type: 'float'  },
      { name: '_place',      type: 'number' },
      { name: '_placedivt',  type: 'string' },
      { name: '_placecomt',  type: 'string' },
      { name: '_oplacedivt', type: 'string' },
      { name: '_oplacecomt', type: 'string' },
    ],
  };

  var individualResultsAdapter = new $.jqx.dataAdapter (individualResultsSource);

  //
  //
  //
  App.createScoresDataAdapter = function (id) {
    var source = {
      localdata: [],
      datatype: 'array',
      datafields: [
        { name: '_place',     type: 'number' },
        { name: '_name',      type: 'string' },
        { name: '_uspsa',     type: 'string' },
        { name: '_squad',     type: 'number' },
        { name: '_class',     type: 'string' },
        { name: '_division',  type: 'string' },
        { name: '_age',       type: 'string' },
        { name: '_lady',      type: 'string' },
        { name: '_military',  type: 'string' },
        { name: '_law',       type: 'string' },
        { name: '_foreign',   type: 'string' },
        { name: '_points',    type: 'number' },
        { name: '_penalty',   type: 'number' },
        { name: '_time',      type: 'float'  },
        { name: '_hf',        type: 'float'  },
        { name: '_stagepts',  type: 'float'  },
        { name: '_stagepct',  type: 'float'  },
        { name: '_matchpts',  type: 'float'  },
        { name: '_matchpct',  type: 'float'  },
        { name: '_a',         type: 'number' },
        { name: '_b',         type: 'number' },
        { name: '_c',         type: 'number' },
        { name: '_d',         type: 'number' },
        { name: '_m',         type: 'number' },
        { name: '_ns',        type: 'number' },
        { name: '_npm',       type: 'number' },
        { name: '_proc',      type: 'number' },
        { name: '_ap',        type: 'number' },
        { name: '_dnf',       type: 'string' },
        { name: '_dq',        type: 'string' },
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

    var adapter = new $.jqx.dataAdapter (source);

    App.scoresDataAdapters [id] = {
      adapter: adapter,
      source: source
    };

    return adapter;
  };

  //
  //  Creates the menu grid and all the stage/division/combined grids. Does not
  //  require the scores to be calculated beforehand.
  //
  App.createScoresGrids = function () {
    var menuGridColumns = [];
    var widest = 0;
    var scoresSource = {
      localdata: [],
      datatype: 'array',
    };

    // FIXME: create a real UUID
    _.each ([{stage_name: '', stage_uuid: 'notarealuuid'}].concat (App.matchData.m.match_stages), function (stage) {
      widest = _.max ([pmelib.getWidthOfText (stage.stage_name) + 8, widest]);
      scoresSource.localdata.push (_.merge ({
          stage_uuid: stage.stage_uuid,
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
          width: pmelib.getWidthOfText (value) + 8,
        });
      }
    );

    _.find (menuGridColumns, {text: 'Stage'}).width = widest;

    //
    //  Overall-<division> (sum of all stages, per division): place, name, uspsa, class, division, age, lady, military, law, foreign, match pts, match %
    //  Overall-Combined (sub of all stages, all divisions): place, name, uspsa, class, division, age, lady, military, law, foreign, match pts, match %
    //  Stage-<division> (per stage, per division): place, name, uspsa, class, division, points, penalty, time, hf, stage pts, stage %
    //  Stage-Combined (per stage, all division): place, name, uspsa, class, division, points, penalty, time, hf, stage pts, stage %
    //
    //  When a cell is clicked in the #menuGrid, it sets s
    //
    var scoresMenuAdapter = new $.jqx.dataAdapter (scoresSource, {
      loadComplete: function (records) {
        var topFragment = document.createDocumentFragment ();
        var overallFields = {
          '_place':    { header: 'Place',      length: 0, pxwidth:  0, extra: { cellsalign: 'right', filtercondition: 'equal' }},
          '_name':     { header: 'Name',       length: 0, pxwidth:  0, },
          '_uspsa':    { header: 'USPSA',      length: 0, pxwidth: 80, },
          '_class':    { header: 'Class',      length: 0, pxwidth: 50, },
          '_division': { header: 'Division',   length: 0, pxwidth:  0, },
          '_age':      { header: 'Age',        length: 0, pxwidth:  0, },
          '_lady':     { header: 'Lady',       length: 0, pxwidth: 40, },
          '_military': { header: 'Military',   length: 0, pxwidth: 60, },
          '_law':      { header: 'Law',        length: 0, pxwidth: 40, },
          '_foreign':  { header: 'Foreign',    length: 0, pxwidth: 60, },
          '_matchpts': { header: 'Match Pts',  length: 0, pxwidth: 90, extra: { cellsformat: 'f4', cellsalign: 'right', }},
          '_matchpct': { header: 'Match %',    length: 0, pxwidth: 80, extra: { cellsformat: 'f2', cellsalign: 'right', filtercondition: 'equal' }},
        };
        var stageFields = {
          '_place':    { header: 'Place',      length: 0, pxwidth:  0, extra: { cellsalign: 'right', filtercondition: 'equal' }},
          '_name':     { header: 'Name',       length: 0, pxwidth:  0, },
          '_class':    { header: 'Class',      length: 0, pxwidth: 50, },
          '_division': { header: 'Division',   length: 0, pxwidth:  0, },
          '_points':   { header: 'Points',     length: 0, pxwidth: 60, extra: { cellsformat: 'd',  cellsalign: 'right', }},
          '_penalty':  { header: 'Penalty',    length: 0, pxwidth: 60, extra: { cellsformat: 'd',  cellsalign: 'right', }},
          '_time':     { header: 'Time',       length: 0, pxwidth: 60, extra: { cellsformat: 'f2', cellsalign: 'right', }},
          '_hf':       { header: 'HF',         length: 0, pxwidth: 70, extra: { cellsformat: 'f4', cellsalign: 'right', }},
          '_stagepts': { header: 'Stage Pts',  length: 0, pxwidth: 80, extra: { cellsformat: 'f4', cellsalign: 'right', filtercondition: 'equal' }},
          '_stagepct': { header: 'Stage %',    length: 0, pxwidth: 80, extra: { cellsformat: 'f2', cellsalign: 'right', filtercondition: 'equal' }},
        };
        var reviewFields = {
          '_name':     { header: 'Name',       length: 0, pxwidth:  0, },
          '_uspsa':    { header: 'USPSA',      length: 0, pxwidth: 80, },
          '_squad':    { header: 'Squad',      length: 0, pxwidth: 50, extra: { cellsalign: 'right', }},
          '_class':    { header: 'Class',      length: 0, pxwidth: 50, },
          '_division': { header: 'Division',   length: 0, pxwidth:  0, },
          '_a':        { header: 'A',          length: 0, pxwidth: 25, extra: { cellsalign: 'right', }},
          '_b':        { header: 'B',          length: 0, pxwidth: 25, extra: { cellsalign: 'right', }},
          '_c':        { header: 'C',          length: 0, pxwidth: 25, extra: { cellsalign: 'right', }},
          '_d':        { header: 'D',          length: 0, pxwidth: 25, extra: { cellsalign: 'right', }},
          '_m':        { header: 'M',          length: 0, pxwidth: 25, extra: { cellsalign: 'right', }},
          '_ns':       { header: 'NS',         length: 0, pxwidth: 35, extra: { cellsalign: 'right', }},
          '_npm':      { header: 'NPM',        length: 0, pxwidth: 45, extra: { cellsalign: 'right', }},
          '_proc':     { header: 'Proc',       length: 0, pxwidth: 45, extra: { cellsalign: 'right', }},
          '_ap':       { header: 'AP',         length: 0, pxwidth: 35, extra: { cellsalign: 'right', }},
          '_time':     { header: 'Time',       length: 0, pxwidth: 60, extra: { cellsformat: 'f2', cellsalign: 'right', }},
          '_hf':       { header: 'HF',         length: 0, pxwidth: 70, extra: { cellsformat: 'f4', cellsalign: 'right', }},
          '_dnf':      { header: 'DNF',        length: 0, pxwidth: 45, },
          '_dq':       { header: 'DQ',         length: 0, pxwidth: 45, },
        };

        var calculateWidths = function (fields) {
          _.each (fields, function (fieldValue, fieldKey) {
            if (!fields [fieldKey].pxwidth) {
              fields [fieldKey].length = fields [fieldKey].header.length;
              fields [fieldKey].pxwidth = _.max ([pmelib.getWidthOfText (fields [fieldKey].header) + 8, fields [fieldKey].pxwidth]);
            }
          });

          _.each (_.keys (fields), function (fieldKey) {
            if (fields [fieldKey].length) {
              var longest;

              if (fieldKey === '_name') {
                longest = _.max (App.matchData.m.match_shooters, function (shooter) {
                  return shooter [fieldKey].length + (shooter.sh_dq ? 5 : 0);
                });

                longest = longest._name + (longest.sh_dq ? ' (DQ)' : '');
              } else {
                longest = _.max (App.matchData.m.match_shooters, function (shooter) {
                  return shooter [fieldKey] ? shooter [fieldKey].length : 0;
                }) [fieldKey];
              }

              fields [fieldKey].pxwidth = _.max ([pmelib.getWidthOfText (longest) + 8, fields [fieldKey].pxwidth]);
            }
          });
        };

        calculateWidths (overallFields);
        calculateWidths (stageFields);
        calculateWidths (reviewFields);

        //
        //  'records' is the list of stages in the match, along with a
        //  pseudo-stage that contains the overall results for each stage.  For
        //  each stage and division, a div is created with display:none. When
        //  the menu cell is clicked, the appropriate div is faded in.
        //
        _.each (records, function (row) {
          _.each (_.filter (_.keys (row), upperCaseOnly), function (section) {
            var isOverall = !row.stage.length;
            var isReview = (section === 'REVIEW') ? true : false;
            var fields = isReview ? reviewFields : (isOverall ? overallFields : stageFields);
            var sectionDiv = document.createElement ('div');
            var p = document.createElement ('p');
            var gridDiv = document.createElement ('div');
            var textDiv = document.createElement ('div');
            var spacerP = document.createElement ('p');
            var button = document.createElement ('input');
            var idDiv = 'section-' + row.stage_uuid + '-' + section;
            var idGrid = idDiv + '-grid';
            var idBack = idDiv + '-back';

            sectionDiv.id = idDiv;
            sectionDiv.style.cssText = 'display: none; margin: 0 auto; text-align: center;';

            p.innerHTML = (row.stage.length ? row.stage : '(All Stages)') + ' -- ' + row [section];
            p.style.cssText = 'margin-top: 0;';

            gridDiv.id = idGrid;
            gridDiv.style.cssText = 'margin: 0 auto; text-align: center;';

            button.type = 'button';
            button.value = 'Back';
            button.setAttribute ('previous-button', idDiv);

            textDiv = document.createElement ('div');
            textDiv.id = idBack;
            textDiv.style.cssText = 'text-align: center;';
            textDiv.appendChild (spacerP);
            textDiv.appendChild (button);

            sectionDiv.appendChild (p);
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
              selectionmode: 'row',
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
        $('#indresDropdownDiv').show ();
      }
    });

    $(menuGrid).jqxGrid ({
      width: _.sum (menuGridColumns, function (col) {return col.width;}),
      height: 100,
      autoheight: true,
      source: scoresMenuAdapter,
      scrollmode: 'logical',
      altrows: true,
      selectionmode: 'singlecell',
      columns: menuGridColumns,
    });

    $(menuGrid).on ('cellselect', function (event) {
      var args = event.args;

      if ((args.datafield === 'stage') || ((args.datafield === 'REVIEW') && (args.rowindex === 0)))
        $(menuGrid).jqxGrid ('unselectcell', args.rowindex, args.datafield);
      else {
        var idDiv = '#section-' + $(menuGrid).jqxGrid ('getrowdata', args.rowindex).stage_uuid + '-' + args.datafield;
        $('#indresDropdownDiv').hide ();
        $(menuGrid).fadeOut (200, function () {
          $(idDiv).fadeIn (200, function () {
            /*
            if (App.urlParms && App.urlParms.kiosk) {
              $('#content').css ('zoom', 1);
              $('#content').css ('zoom', $(window).width () / ($(idDiv + '-grid').width () + 30));
            }
            */
          });
        });
      }
    });

    /* _DEBUG
    $(menuGrid).on ('pagesizechanged', function (event) {
      console.log ('pagesizechanged eventx');
      console.dir (event.args.oldpagesize);
      console.dir (event.args.pagesize);
    });

    window.onresize = function () {
      console.log ('onresize event');
    };

    $('#resizeButton').jqxButton ({width: 65});
    $('#resizeButton').on ('click', function () {
      console.log ('Setting zoom to 2.50');
      $('#jqxMenu, #section, #matchname, #indresDropdownDiv, #copyright').hide ();
      $('#testDiv').css ('zoom', 2.50);
    });
    */

    $(menuGrid).on ('contextmenu', function () {
      return false;
    });

    var indresColumns = [
      { text: 'Stage',     datafield: '_stage',     width: 200, align: 'center', },
      { text: 'A',         datafield: '_a',         width:  35, align: 'center', cellsalign: 'right', },
      { text: 'B',         datafield: '_b',         width:  35, align: 'center', cellsalign: 'right', },
      { text: 'C',         datafield: '_c',         width:  35, align: 'center', cellsalign: 'right', },
      { text: 'D',         datafield: '_d',         width:  35, align: 'center', cellsalign: 'right', },
      { text: 'M',         datafield: '_m',         width:  35, align: 'center', cellsalign: 'right', },
      { text: 'NPM',       datafield: '_npm',       width:  35, align: 'center', cellsalign: 'right', },
      { text: 'Steel',     datafield: '_steel',     width:  55, align: 'center', cellsalign: 'right', },
      { text: 'Paper',     datafield: '_paperp',    width:  45, align: 'center', cellsalign: 'right', },
      { text: 'Steel',     datafield: '_steelp',    width:  60, align: 'center', cellsalign: 'right', },
      { text: 'M',         datafield: '_mp',        width:  35, align: 'center', cellsalign: 'right', },
      { text: 'NS',        datafield: '_nsp',       width:  35, align: 'center', cellsalign: 'right', },
      { text: 'Proc',      datafield: '_procp',     width:  45, align: 'center', cellsalign: 'right', },
      { text: 'Time',      datafield: '_time',      width:  60, align: 'center', cellsalign: 'right', cellsformat: 'f2', },
      { text: 'HF',        datafield: '_hf',        width:  70, align: 'center', cellsalign: 'right', cellsformat: 'f4', },
      { text: 'Division',  datafield: '_placedivt', width:  80, align: 'center', cellsalign: 'right', },
      { text: 'Combined',  datafield: '_placecomt', width:  80, align: 'center', cellsalign: 'right', },
    ];

    $('#indresGrid').jqxGrid ({
      width: _.sum (indresColumns, 'width'),
      height: 100,
      autoheight: true,
      scrollmode: 'logical',
      altrows: true,
      sortable: true,
      showsortmenuitems: false,
      selectionmode: 'none',
      columns: indresColumns,
    });

    $('#indresDropdown').jqxDropDownList ({
      height:        25,
      width:         300,
      displayMember: '_nameuspsa',
      valueMember:   'sh_uid',
      source:        shooterAdapter,
    });

    $('#indresDropdown').on ('select', function (event) {
      if (event.args.index === -1)
        return;

      var temp;
      var shooter_uuid = event.args.item.value;
      var shooter = App.quickFind.shooters [shooter_uuid];
      var inDivision = _.filter (App.matchData.m.match_shooters, 'sh_dvp', App.quickFind.shooters [shooter_uuid].sh_dvp).length;
      var inMatch = _.filter (App.matchData.m.match_shooters, 'sh_del', false).length;
      var summary = {};
      var records = _.remove (_.map (App.scores, function (stage, stage_uuid) {
        if ((temp = _.find (stage.REVIEW, {shtr: shooter_uuid})))
          temp._stage = App.quickFind.stages [stage_uuid].stage_name;
        return temp;
      }), _.isObject);

      _.each (records, function (score) {
        score._steel = score._sh + ' / ' + score._st;
        score._placedivt = score._placediv + ' / ' + inDivision;
        score._placecomt = score._placecom + ' / ' + inMatch;
      });

      summary._a = _.sum (records, '_a');
      summary._b = _.sum (records, '_b');
      summary._c = _.sum (records, '_c');
      summary._d = _.sum (records, '_d');
      summary._m = _.sum (records, '_m');
      summary._npm = _.sum (records, '_npm');
      summary._steel = _.sum (records, '_sh') + ' / ' + _.sum (records, '_st');
      summary._paperp = _.sum (records, '_paperp');
      summary._steelp = _.sum (records, '_steelp');
      summary._mp = _.sum (records, '_mp');
      summary._nsp = _.sum (records, '_nsp');
      summary._procp = _.sum (records, '_procp');
      summary._time = _.sum (records, '_time');
      summary._placedivt = App.quickFind.shooters [shooter_uuid]._oplacediv + ' / ' + inDivision;
      summary._placecomt = App.quickFind.shooters [shooter_uuid]._oplacecom + ' / ' + inMatch;
      summary._stage = 'Overall';

      records.push (summary);

      individualResultsSource.localdata = records;

      $('#indresGrid').jqxGrid ({source: individualResultsAdapter});
      $('#indresH3').text (sprintf ("%s -- %s -- '%s' Class -- %s%s", shooter._name, shooter._uspsa, shooter._class, shooter._division, shooter._pf.length ? ', ' + shooter._pf : ''));
      $('#menuGrid').fadeOut (200, function () {
        $('#indresDiv').fadeIn (200, function () {
          $('#indresDropdownDiv').show ();
        });
      });
    });

    $('[previous-button]').jqxButton ({width: 65, theme: 'default'});
    $('[previous-button]').on ('click', function () {
      $('#' + $(this).attr ('previous-button')).fadeOut (200, function () {
        $(menuGrid).jqxGrid ('clearselection');
        $(menuGrid).fadeIn (200, function () {
          $('#indresDropdown').jqxDropDownList ('selectedIndex', -1);
          $('#indresDropdownDiv').show ();
        });
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
    var reviewScoresByStage = {};
    var matchScoresByStageCombined = {};
    var matchScoresByStageByDivision = {};
    var matchScoresByDivisionAllStages = {};
    var finalscores = {
      notarealuuid: {
        COMBINED: [],
      },
    };
    var highMatchpts;
    var highHF;
    var percentage;

    //
    //  Create all the structure indices
    //
    _.each (App.matchDivisions, function (division) {
      matchScoresByDivisionAllStages [division] = [];
    });

    _.each (matchData.m.match_stages, function (stage) {
      reviewScoresByStage [stage.stage_uuid] = {};
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

      if (stage.stage_scoretype === 'Fixed') {
        stage.stage_points = _.max (stageScores.stage_stagescores, function (score) {
          return score.hf;
        }).hf;
      }
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
        var review;
        var shooter = App.quickFind.shooters [score.shtr];
        var _score = pmelib.calculateScore (stage, score, App.quickFind.shooters [score.shtr]);

        //
        //  These are the fields that get bound to the dataAdapter
        //
        score._name = shooter._name + (shooter.sh_dq ? ' (DQ)' : '');
        score._uspsa = shooter._uspsa;
        score._class = shooter._class;
        score._division = shooter._divisiont;
        score._squad = shooter._squad;
        score._age = shooter._age;
        score._lady = shooter._lady;
        score._military = shooter._military;
        score._law = shooter._law;
        score._foreign = shooter._foreign;
        score._dq = shooter._dq;

        score._dnf = _score.dnf;
        score._points = _score.points;
        score._penalty = _score.penalty;
        score._time = _score.time;
        score._hf = _score.hf;
        score._stagepts = 0;
        score._stagepct = 0;
        score._matchpts = 0;
        score._matchpct = 0;

        //
        //  Delete un-needed fields (don't a requirement, makes debugging
        //  easier) Most of these get copied into _score by the
        //  calculateScore() function.
        //
        //  Seems to be faster to not delete them.
        //
        /*
        delete score._fieldParsed;
        delete score._pendingChanges;
        delete score.apen;
        delete score.aprv;
        delete score.dname;
        delete score.dqr;
        delete score.mod;
        delete score.ots;
        delete score.penr;
        delete score.poph;
        delete score.popm;
        delete score.udid;
        */

        review = _.clone (score);
        review._dnf = _score.dnf ? 'Y' : '';
        review._a = _score.a;           // A hits
        review._b = _score.b;           // B hits
        review._c = _score.c;           // C hits
        review._d = _score.d;           // D hits
        review._m = _score.m;           // Misses
        review._ns = _score.ns;         // No-shoots
        review._npm = _score.npm;       // Non-penalty misses
        review._proc = _score.p;        // Procedurals
        review._ap = _score.ap;         // Additional penalties
        review._sh = _score.sh;         // Steel hits
        review._st = _score.st;         // Steel total
        review._paperp = _score.paperp; // Paper points
        review._steelp = _score.steelp; // Steel points
        review._mp = _score.mp;         // Miss points
        review._nsp = _score.nsp;       // No-shoot points
        review._procp = _score.procp;   // Procedural (include additional penalty) points

        reviewScoresByStage [stage_uuid][shooter.sh_uid] = review;
        matchScoresByStageCombined [stage_uuid].push (_.clone (score));
        matchScoresByStageByDivision [stage_uuid][shooter.sh_dvp].push (_.clone (score));

        if (_.findIndex (matchScoresByDivisionAllStages [shooter.sh_dvp], {shtr: score.shtr}) === -1)
          matchScoresByDivisionAllStages [shooter.sh_dvp].push (_.clone (score));
      });
    });

    var sortFunction = function (score) {
      if (score._dq)
        return -3.0;
      if (score._dnf)
        return -2.0;
      if ((score._time === 0.0) && (score._hf === 0.0))
        return -1.0;

      return score._hf;
    };

    _.each (reviewScoresByStage, function (stage, stage_uuid) {
      finalscores [stage_uuid] = {};
      finalscores [stage_uuid].REVIEW = _.sortBy (stage, '_name');
    });

    //
    //  Create the COMBINED scores by sorting all the scores of the stage by
    //  hit factor, in descending order.
    //
    _.each (matchScoresByStageCombined, function (stage, stage_uuid) {
      var stagePoints = App.quickFind.stages [stage_uuid].stage_points || 0;

      finalscores [stage_uuid].COMBINED = _.map (_.sortByOrder (stage, sortFunction, 'desc'), function (score, score_index) {
        score._place = score_index + 1;
        reviewScoresByStage [stage_uuid][score.shtr]._placecom = score._place;
        return score;
      });

      if ((highHF = _.max (finalscores [stage_uuid].COMBINED, '_hf')._hf))
        _.each (finalscores [stage_uuid].COMBINED, function (score) {
          percentage = (Math.round (score._hf * 10000) / 10000) / (Math.round (highHF * 10000) / 10000);
          score._stagepts = Math.round ((stagePoints * percentage) * 10000) / 10000;
          score._stagepct = percentage * 100;
          App.quickFind.shooters [score.shtr]._matchpts += score._stagepts;
        });
    });

    //
    //  Create the division scores by sorting the scores of each division by
    //  hit factor, in descending order.
    //
    _.each (matchScoresByStageByDivision, function (divisions, stage_uuid) {
      var stagePoints = App.quickFind.stages [stage_uuid].stage_points || 0;

      _.each (divisions, function (division, division_name) {
        finalscores [stage_uuid][division_name] = _.map (_.sortByOrder (division, sortFunction, 'desc'), function (score, score_index) {
          score._place = score_index + 1;
          reviewScoresByStage [stage_uuid][score.shtr]._placediv = score._place;
          return score;
        });

        //
        //  Now that the we have the scores ordered by hit factor and broken
        //  into divisions, we can calculate the stage points and percentage
        //  for this stage and division.
        //
        if ((highHF = _.max (finalscores [stage_uuid][division_name], '_hf')._hf))
          _.each (finalscores [stage_uuid][division_name], function (score) {
            percentage = (Math.round (score._hf * 10000) / 10000) / (Math.round (highHF * 10000) / 10000);
            score._stagepts = Math.round ((stagePoints * percentage) * 10000) / 10000;
            score._stagepct = percentage * 100;
            App.quickFind.shooters [score.shtr]._stagepts += score._stagepts;
          });
      });
    });

    //
    //  Copy the accumulated stage points to _matchpts for doing the sorting
    //  and percentage calculation.
    //
    _.each (matchData.m.match_shooters, function (shooter) {
      var score = _.find (matchScoresByDivisionAllStages [shooter.sh_dvp], {shtr: shooter.sh_uid});
      score._matchpts = shooter._stagepts;
    });

    _.each (matchScoresByDivisionAllStages, function (division, division_name) {
      finalscores.notarealuuid [division_name] = _.map (_.sortByOrder (division, function (score) {return (score._dq) ? -3.0 : score._matchpts;}, 'desc'), function (score, score_index) {
        score._place = score_index + 1;
        App.quickFind.shooters [score.shtr]._oplacediv = score._place;
        finalscores.notarealuuid.COMBINED.push (_.clone (score));
        return score;
      });

      if ((highMatchpts = _.max (finalscores.notarealuuid [division_name], '_matchpts')._matchpts))
        _.each (finalscores.notarealuuid [division_name], function (score) {
          percentage = (Math.round (score._matchpts * 10000) / 10000) / (Math.round (highMatchpts * 10000) / 10000);
          score._matchpts = Math.round ((highMatchpts * percentage) * 10000) / 10000;
          score._matchpct = percentage * 100;
        });
    });

    _.each (matchData.m.match_shooters, function (shooter) {
      var score = _.find (finalscores.notarealuuid.COMBINED, {shtr: shooter.sh_uid});
      score._matchpts = shooter._matchpts;
    });

    finalscores.notarealuuid.COMBINED = _.map (_.sortByOrder (finalscores.notarealuuid.COMBINED, function (score) {return (score._dq) ? -3.0 : score._matchpts;}, 'desc'), function (score, score_index) {
      score._place = score_index + 1;
      App.quickFind.shooters [score.shtr]._oplacecom = score._place;
      return score;
    });

    if ((highMatchpts = _.max (finalscores.notarealuuid.COMBINED, '_matchpts')._matchpts))
      _.each (finalscores.notarealuuid.COMBINED, function (score) {
        percentage = (Math.round (score._matchpts * 10000) / 10000) / (Math.round (highMatchpts * 10000) / 10000);
        score._matchpts = Math.round ((highMatchpts * percentage) * 10000) / 10000;
        score._matchpct = percentage * 100;
      });

    return finalscores;
  };

  //
  //  The grids have been created, the adapters have been created, and the
  //  scores have been calculated. Now bind the scores data to the adapters,
  //  then assign the adapters to the grids.
  //
  App.bindScoresToAdapters = function (scores) {
    var records = $(menuGrid).jqxGrid ('getrows');

    _.each (records, function (stage) {
      _.each (_.filter (_.keys (stage), upperCaseOnly), function (section) {
        var idGrid = 'section-' + stage.stage_uuid + '-' + section + '-grid';
        var adapters = App.scoresDataAdapters [idGrid];

        adapters.source.localdata = scores [stage.stage_uuid][section];
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
    $('#scoresGrids').empty ().append (p).show ();
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

      console.time ('startup');
      _.each (App.matchData.m.match_shooters, function (shooter) {
        shooter._name = shooter.sh_ln + ', ' + shooter.sh_fn;
        shooter._uspsa = shooter.sh_id || '';
        shooter._nameuspsa = shooter._name + (shooter._uspsa.length ? (' (' + shooter._uspsa + ')') : '');
        shooter._squad = shooter.sh_sqd;
        shooter._class = App.matchData.l.classes [shooter.sh_grd] || shooter.sh_grd;
        shooter._division = App.matchData.l.divisions [shooter.sh_dvp] || shooter.sh_dvp;
        shooter._divisiont = (App.matchData.l.divisions [shooter.sh_dvp] || shooter.sh_dvp) + (((shooter.sh_dvp === 'PROD') || (shooter.sh_dvp === 'CO')) ? '' : (shooter.sh_pf === 'MAJOR') ? '+' : '-');
        shooter._pf = ((shooter.sh_dvp === 'PROD') || (shooter.sh_dvp === 'CO')) ? '' : (App.matchData.l.powerfactors [shooter.sh_pf] || '');
        shooter._age = (shooter.sh_age !== 'ADULT') ? (App.matchData.l.ages [shooter.sh_age] || shooter.sh_age) : '';
        shooter._lady = (shooter.sh_gen === 'FEMALE') ? 'Y' : '';
        shooter._military = shooter.sh_mil ? 'Y' : '';
        shooter._law = shooter.sh_law ? 'Y' : '';
        shooter._foreign = shooter.sh_frn ? 'Y' : '';
        shooter._dq = shooter.sh_dq ? 'Y' : '';
        shooter._stagepts = 0;
        shooter._matchpts = 0;
      });

      shooterSource.localdata = _.sortBy (App.matchData.m.match_shooters, '_nameuspsa');

      pmelib.removeDeletedShooters (App.matchData);
      pmelib.removeDeletedStages (App.matchData);
      App.matchDivisions = pmelib.getMatchDivisions (App.matchData);
      App.matchDivisionsLong = pmelib.getMatchDivisionsLong (App.matchData);
      App.quickFind = pmelib.createQuickFindList (App.matchData);

      console.time ('createScoresGrid');
      App.createScoresGrids ();
      console.timeEnd ('createScoresGrid');
      console.time ('calculateScores');
      App.scores = App.calculateScores (App.matchData);
      console.timeEnd ('calculateScores');
      console.time ('bindScoresToAdapters');
      App.bindScoresToAdapters (App.scores);
      console.timeEnd ('bindScoresToAdapters');
      console.timeEnd ('startup');

      var elementToFade = '#menuGrid';
      /*
      var elementToZoom = '#menuGrid';
      var elementToHide;

      if (App.urlParms && App.urlParms.kiosk && App.urlParms.division) {
        elementToFade = '#section-notarealuuid-' + App.urlParms.division.toUpperCase ();
        elementToZoom = elementToFade + '-grid';
        elementToHide = elementToFade + '-back';

        $(elementToHide).hide ();
      }
      */

      $(elementToFade).fadeIn (200, function () {
        /*
        if (App.urlParms && App.urlParms.kiosk) {
          $(elementToZoom).css ('zoom', 1);
          $(elementToZoom).css ('zoom', $(window).width () / ($(elementToZoom).width () + 30));
        }
        */
      });
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

  //
  //  'Main'
  //
  /*
  App.urlParms = pmelib.queryString ();

  if (App.urlParms.kiosk) {
    console.log ('edit/scores2/uspsa:kiosk=1'); // _DEBUG
    window.pmeModule = window.pmeModule || {name: 'scores2'};
    window.pmeModule.enableKiosk = function () {
      App.socket.on ('kiosk_page', function (param) {
        if (param.url)
          window.location.href = param.url;
      });
    };
  }
  */

  App.reload = function () {
    alert ('New match loaded, reloading scores page!');
    window.location.href = 'http://' + window.location.host + '/edit/scores2';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.updateGrid);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {'msg': 'View/Edit->Scores (USPSA)'});
});
