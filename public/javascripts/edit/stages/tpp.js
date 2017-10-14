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

    App.matchData = matchData;

    if (!matchData || !matchData.m || !matchData.m.match_stages || !matchData.m.match_stages.length) {
      $('#stageTable').hide ();
      $('#stageMessage').text ('(No stages defined)').show ();
      return;
    }

    _.each (stages, function (s) {
      newRows = newRows +
        '<tr>' +
          '<td><input type="checkbox" id="sclickid_' + clickId + '"></td>' +
          '<td>' + s.stage_number + '</td>' +
          '<td>' + s.stage_name + '</td>' +
          '<td>' + s.stage_scoretype + '</td>' +
          '<td>' + s.stage_strings + '</td>' +
          '<td>' + s.stage_points + '</td>' +
          '<td>' + (s.stage_classifier ? s.stage_classifiercode : '--') + '</td>' +
        '</tr>';
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
        },
      },
    });

    $('#stageTable').trigger ('update').show ();

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

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_data', App.matchDataReceived);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.emit ('log:log', {'msg': 'View/Edit->Stages (TPP)'});
});
