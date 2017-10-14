/* global io, moment */
/* global _:false */
/* jshint devel: true */

$(function () {
  'use strict';

  var App = {};

  App.timeFormatUTC = function (time) {
    return moment.utc (time).local ().format ('YYYY-MM-DD HH:mm:ss');
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    // App.socket.emit ('file:ezws:db:list');
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.databaseFileListReceived = function (param) {
    var newRows = '';
    var clickId = 0;

    if (param.err) {
      $('#scanningDiv,#noFilesDiv,#matchFilesDiv').hide ();
      $('#systemError').text ('System Error: ' + param.err);
      $('#systemErrorDiv').show ();
      return;
    }

    if (!param.matchFiles.length) {
      $('#systemErrorDiv,#scanningDiv,#matchFilesDiv').hide ();
      $('#noFilesDiv').show ();
      return;
    }

    _.each (param.matchFiles, function (m) {
      newRows = newRows +
        '<tr>' +
          '<td><input type="checkbox" id="clickid_' + clickId + '"></td>' +
          '<td>' + m.match_name + '</td>' +
          '<td>' + m.match_date + '</td>' +
          '<td>' + m.match_discipline + '</td>' +
          '<td>' + App.timeFormatUTC (m.match_modified) + '</td>' +
          '<td>' + m.match_filename + '</td>' +
        '</tr>';

      clickId++;
    });

    $('#matchFilesTable > tbody').empty ();
    $('#matchFilesTable tbody').append (newRows);
    $('#loadMessageDiv').toggle (param.saveCurrent);
    $('#loadButton').show ();
    $('#matchFilesTable').trigger ('update').show ();

    $('input[type="checkbox"]').off ().on ('change', function (e) {
      var clickTarget = /clickid_(\d+)$/.exec (e.target.id);

      if (clickTarget && (clickTarget [1] < param.matchFiles.length)) {
        $('input[type="checkbox"]').prop ('checked', false);
        $('#clickid_' + clickTarget [1]).prop ('checked', true);
        $('#loadButton').removeAttr ('disabled');
      }
      else
        alert ('WTF? Something failed in setting the click target');
    });

    $('#loadButton')
      .off ()
      .click (function (e) {
        var n = $('input:checked');

        this.blur ();
        e.preventDefault ();

        if (n.length > 1)
          alert ('WTF? How is more than one item checked?');
        else {
          var matchTarget = /clickid_(\d+)$/.exec (n [0].id);

          if (matchTarget && (matchTarget [1] < param.matchFiles.length))
            App.socket.emit ('file:ezws:db:load', {
              'uuid': param.matchFiles [matchTarget [1]].match_uuid,
              'file': param.matchFiles [matchTarget [1]].match_file,
            });
          else
            alert ('WTF? How is the click target out of range?');
        }
      }
    );
  };

  App.databaseLoaded = function (param) {
    if (param.err)
      $('#loadMessage').text ('System Error: ' + param.err);
    else {
      $('#loadMessage').text ('Match successfully loaded');
      $('#matchname').text (param.matchName);
    }

    $('#loadMessageDiv').show ();
  };

  //
  //
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

  $('#matchFilesTable th').attr ('data-placeholder', '[All]');
  $('#matchFilesTable').tablesorter (
  {
    theme: 'jui',
    widthFixed: false,
    headerTemplate: '{content} {icon}',
    sortList: [
      [2,1],[4,1]
    ],
    emptyTo: 'none',
    headers: {
      0: { sorter: false,
           filter: false,
         },
    },
    widgets: ['filter', 'uitheme', 'zebra'],
    widgetOptions: {
      zebra: ['even', 'odd'],
      filter_hideFilters: true,
      filter_functions: {
        3 : true, // Type
      },
    },
  });

  //
  //
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('database_list_ezws', App.databaseFileListReceived);
  App.socket.on ('database_loaded', App.databaseLoaded);
  App.socket.emit ('log:log', {'msg': 'File->Import->EzWinScore'});
});
