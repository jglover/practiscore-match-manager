/* global io */
/* global _:false */
/* jshint devel: true */

$(function () {
  'use strict';

  var App = {};

  App.socketConnect = function () {
    App.socket.emit ('match:request', {options: {match: true}});

    $('#serverDisconnect').hide ();
    $('#content,#menu').show ();
  };

  App.socketDisconnect = function () {
    $('#serverDisconnect').show ();
    $('#content,#menu').hide ();
  };

  App.matchDataReceived = function (param) {
    var newRows = '';
    var clickId = 0;
    var matchData = param.matchData;
    var stages = matchData.m.match_stages;
    var totalHits = 0;
    var totalPoints = 0;
    var totalPaper = 0;
    var totalSteel = 0;

    App.matchData = matchData;

    if (!matchData || !matchData.m || !matchData.m.match_stages || !matchData.m.match_stages.length) {
      $('#stageTable').hide ();
      $('#stageMessage').text ('(No stages defined)').show ();
      return;
    }

    _.each (stages, function (s) {
      var hits = s.stage_targets.reduce (function (a, b) { return a + b.target_reqshots; }, 0) + s.stage_poppers;
      var npms = s.stage_targets.reduce (function (a, b) { return a + b.target_maxnpms; }, 0);

      newRows = newRows +
        '<tr>' +
          '<td><input type="checkbox" id="sclickid_' + clickId + '"></td>' +
          '<td>' + s.stage_number + '</td>' +
          '<td>' + s.stage_name + '</td>' +
          '<td>' + s.stage_scoretype + '</td>' +
          '<td>' + s.stage_strings + '</td>' +
          '<td>' + (s.stage_classifier ? s.stage_classifiercode : '--') + '</td>' +
          '<td>' + (s.stage_noshoots ? 'Yes' : 'No') + '</td>' +
          '<td>' + s.stage_poppers + '</td>' +
          '<td id="tclickid_' + clickId + '"' + (s.stage_targets.length ? (' class="tablesorter-force-link"><a id="aclickid_' + clickId + '" href="#">' + s.stage_targets.length + '</a>') : '>0') + '</td>' +
          '<td>' + (s.stage_targets.length ? s.stage_classictargets ? 'Classic' : 'Metric' : 'Steel') + '</td>' +
          '<td>' + npms + '</td>' +
          '<td>' + hits + '</td>' +
          '<td class="' + ((s.stage_points / 5) !== hits ? 'red' : '') + '">' + s.stage_points + '</td>' +
        '</tr>';

      totalHits += hits;
      totalPoints += s.stage_points;
      totalPaper += s.stage_targets.length;
      totalSteel += s.stage_poppers;
      clickId++;
    });

    $('#stageTbody').empty ().append (newRows);

    $('#stageTable th').attr ('data-placeholder', '[All]');
    $('#stageTable').tablesorter ({
      theme: 'jui',
      widthFixed: false,
      headerTemplate: '{content} {icon}',
      sortList: [
        [1,0]
      ],
      emptyTo: 'none',
      headers: {
        0: { sorter: false,
             filter: false,
           },
      },
      widgets: ['saveSort', 'filter', 'uitheme', 'zebra'],
      widgetOptions: {
        zebra: ['even', 'odd'],
        saveSort: true,
        filter_hideFilters: true,
        filter_functions: {
          '.col-scoring':  true, // Scoring
          '.col-noshoots': true, // No shoots
          '.col-type':     true, // Type
        },
      },
    });

    $('#stageTable').trigger ('update').show ();

    clickId = 0;
    _.each (stages, function () {
      $('#tclickid_' + clickId).off ().click (function (e) {
        var clickTarget = /.clickid_(\d+)$/.exec (e.target.id);

        if (clickTarget && (clickTarget [1] < App.matchData.m.match_stages.length)) {
          var s = App.matchData.m.match_stages [clickTarget [1]];
          var newRows = '';

          e.preventDefault ();

          $('#popup-content-stagehits').text (s.stage_targets.length + (s.stage_classicTargets ? ' classic ' : ' metric ') + 'targets');

          _.each (s.stage_targets, function (t) {
            newRows = newRows +
              '<tr>' +
                '<td>' + t.target_number + '</td>' +
                '<td>' + t.target_reqshots + '</td>' +
                '<td>' + t.target_maxnpms + '</td>' +
              '</tr>';
          });

          $('#popup-content-table > tbody').empty ();
          $('#popup-content-table tbody').append (newRows);
          $('#popup').dialog ({
            width: 'auto',
            title: s.stage_name,
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
        }
      });

      clickId++;
    });

    $('#stageMessage').text (totalPoints + ' points, ' + totalHits + ' rounds, ' + totalPaper + ' paper targets, ' + totalSteel + ' steel');

    $('input[type="checkbox"]').off ().on ('change', function (e) {
      var clickTarget = /sclickid_(\d+)$/.exec (e.target.id);

      if (clickTarget && (clickTarget [1] < stages.length)) {
        $('input[type="checkbox"]').prop ('checked', false);
        $('#sclickid_' + clickTarget [1]).prop ('checked', true);
        $('#editButton').button ('enable');
        $('#addButton').button ('enable');
      }
      else
        alert ('WTF? Something failed in setting the click target');
    });

    $('#addButton')
      .button ()
      .off ()
      .click (function (e) {
        this.blur ();
        e.preventDefault ();
        console.log ('Add clicked!');
      }
    );

    $('#editButton')
      .button ()
      .off ()
      .click (function (e) {
        var n = $('input:checked');

        this.blur ();
        e.preventDefault ();

        if (n.length > 1)
          alert ('WTF? How is more than one item checked?');
        else {
          var stageTarget = /clickid_(\d+)$/.exec (n [0].id);

          if (stageTarget && (stageTarget [1] < stages.length))
             console.log (stages [stageTarget [1]].stage_name);
            // App.socket.emit ('database:load', {'uuid': param.matches [stageTarget [1]].match_uuid});
          else
            alert ('WTF? How is the click target out of range?');
        }
      }
    );
  };

  App.matchUpdated = function () {
    App.socket.emit ('match:request', {options: {match: true}});
  };

  //
  //  Change default jQuery uitheme icons - find the full list of icons here:
  //  http://jqueryui.com/themeroller/
  //
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
    window.location.href = 'http://' + window.location.host + '/edit/stages';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_data', App.matchDataReceived);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {'msg': 'View/Edit->Stages (USPSA)'});
});
