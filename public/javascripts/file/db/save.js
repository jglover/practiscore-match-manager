/* global io */

$(function () {
  'use strict';

  var App = {};

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  App.databaseSavedNewReceived = function (param) {
    if (param.err)
      $('#savenewMessage').text ('System Err: ' + param.err).show ();
    else
      $('#savenewMessage').text ('Match successfully saved as new match').show ();

    $('#saveMessage').hide ();
  };

  $('[controltype=button]').each (function () {
    $(this).jqxButton ({
      width: $(this).attr ('button-width'),
    });
  });

  $('#buttonSave').on ('click', function () {
      $('#saveMessage').text ('Saving match...');
      App.socket.emit ('file:db:save', function (data) {
        if (data.err)
          $('#saveMessage').text ('System Err: ' + data.err).addClass ('bold').show ();
        else
          $('#saveMessage').text ('Match successfully saved').addClass ('bold').show ();

        $('#savenewMessage').hide ();
      });
  });

  $('#buttonSaveAsNew').on ('click', function () {
    $('#savenewMessage').text ('Saving as new match...');
    App.socket.emit ('file:db:savenew', function (data) {
        if (data.err)
          $('#savenewMessage').text ('System Err: ' + data.err).addClass ('bold').show ();
        else
          $('#savenewMessage').text ('Match successfully saved as new match').addClass ('bold').show ();

        $('#saveMessage').hide ();
    });
  });

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.socket.emit ('match:name', function (data) {
      $('#matchname').text (data.matchname);
    });
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/file/db/save';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.reload);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {'msg': 'File->Database->Save Match'});
});
