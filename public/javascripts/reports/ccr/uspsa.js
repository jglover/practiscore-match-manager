/* global io, pmelib */
/* global _: false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  //
  //  page, label, columns and rows are in pt, except for label.radius
  //  geometry is number of label across, down and on each page
  //
  var labelSpec = {
    //
    //  Avery 5388 or equivalent. 8.5" x 11" sheet with 3 labels in a 1
    //  column, 3 row format. The sheet is 612pt x 792pt, with a usable height
    //  of 760pt.  Each card is 3" high x 5" wide (216pt x 360pt)
    //
    5388: {
      page: {
        width:  612,
        height: 760,
      },
      label: {
        width:  360,
        height: 216,
        radius:   7
      },
      geometry: {
        across: 1,
        down:   3,
        page:   3
      },
      columns: [
        126,
      ],
      rows: [
        (72 + 9), (288 + 9), (504 + 9)
      ],
      format: {
        ccr: function () {
          return [
            { text: 'Competitor Change Request',                            attrs: {x: '180.0pt', y:  '18.0pt', 'text-anchor': 'middle', style: 'font-family: Arial; font-size: 18pt; vertical-align: top; font-weight: bold;' }},
            { text: 'Name: ____________________________________',           attrs: {x:  '18.0pt', y:  '51.0pt', 'text-anchor': 'start',  style: 'font-family: Arial; font-size: 14pt; vertical-align: top;' }},
            { text: 'USPSA #: ______________',                              attrs: {x:  '18.0pt', y:  '78.0pt', 'text-anchor': 'start',  style: 'font-family: Arial; font-size: 14pt; vertical-align: top;' }},
            { text: 'Division:    OPEN    LIM    L10    PROD    SS    REV', attrs: {x:  '18.0pt', y: '105.0pt', 'text-anchor': 'start',  style: 'font-family: Arial; font-size: 14pt; vertical-align: top;' }},
            { text: 'Power Factor:    MAJOR    MINOR',                      attrs: {x:  '18.0pt', y: '132.0pt', 'text-anchor': 'start',  style: 'font-family: Arial; font-size: 14pt; vertical-align: top;' }},
            { text: 'Class:    GM    M    A    B    C    D    U',           attrs: {x:  '18.0pt', y: '159.0pt', 'text-anchor': 'start',  style: 'font-family: Arial; font-size: 14pt; vertical-align: top;' }},
            { text: 'Category:   LADY   JNR   SNR   SSR   MIL   LEO',       attrs: {x:  '18.0pt', y: '186.0pt', 'text-anchor': 'start',  style: 'font-family: Arial; font-size: 14pt; vertical-align: top;' }},
          ];
        },
      },
    }
  };

  App.renderLabels = function (pv) {
    pmelib.labelEngine (pv, [null],
      function (shooter, addLabelCallback) {
        _.times (3, function () {
          addLabelCallback (pv.labelSpec.format.ccr ());
        });
      }
    );
  };

  $('#button-print-preview').jqxButton ({width: 105});

  $('#button-print-preview').click (function () {
      App.renderLabels ({
        nextCompetitorsStartsOn: 'next',
        labelSpec: labelSpec ['5388'],
      });
      window.print ();
  });

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/reports/ccr';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Reports->CCR Cards'});

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
