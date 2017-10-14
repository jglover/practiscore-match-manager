/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  $('#buttonImport').jqxButton ({width: 65});
  $('#buttonImport').on ('click', function () {
    App.socket.emit ('utils:jcw:import', function (data) {
      if (data.msg)
        $('#msgImport').text (data.msg).show ();
    });
  });

  $('#buttonCreate').jqxButton ({width: 65});
  $('#buttonCreate').on ('click', function () {
    App.socket.emit ('utils:jcw:create', function (data) {
      if (data.msg)
        $('#msgCreate').text (data.msg).show ();
    });
  });

  $('#buttonDelete').jqxButton ({width: 65});
  $('#buttonDelete').on ('click', function () {
    App.socket.emit ('utils:jcw:delete', function (data) {
      if (data.msg)
        $('#msgDelete').text (data.msg).show ();
    });
  });

  $('#buttonExport').jqxButton ({width: 65});
  $('#buttonExport').on ('click', function () {
    App.socket.emit ('utils:jcw:export', function (data) {
      if (data.msg)
        $('#msgExport').text (data.msg).show ();
    });
  });

  App.socket = io.connect ();

  App.socket.on ('connect', function () {
    $('[message]').text ('').hide ();
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();
  });

  App.socket.on ('disconnect', function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  });

  App.socket.emit ('log:log', {'msg': 'Utilities->JCW'});
});
