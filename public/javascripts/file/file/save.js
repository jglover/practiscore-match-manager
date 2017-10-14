/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  $('button').jqxButton ({width: 65});
  $('#fileName').jqxInput ({width: 400, height: 25, maxLength: 40});
  $('#overwrite').jqxCheckBox ();
  $('#saveButton').jqxButton ('focus');

  $('#saveButton').click (function () {
    $('#saveForm').jqxValidator ('validate');
  });

  $('#resetButton').click (function () {
    $('#fileName').jqxInput ('val', App.resetValue);
    $('#saveForm').jqxValidator ('hideHint', '#fileName');
    $('#saveButton').jqxButton ({disabled: false});
  });

  $('#saveForm').jqxValidator ({
    focus: true,
    closeOnClick: false,
    onSuccess: function () {
      var filename = $('#fileName').val ();

      if (!filename.match (/\.psc$/))
        filename += '.psc';

      $('#saveMessage').text ('Saving match...');

      App.socket.emit ('file:psc:save', {value: filename, overwrite: $('#overwrite').jqxCheckBox ('checked')}, function (data) {
        if (data.err)
          $('#saveMessage').text ('System Err: ' + data.err).show ();
        else if (data.saved)
          $('#saveMessage').text ('Match saved to ' + data.filename).show ();
        else if (data.fileexists)
          $('#saveMessage').text ('Match not saved! Match with that name already exists!').show ();
        else
          $('#saveMessage').text ('WTF? No error, not saved, and doesn\'t exist?').show ();
      });
    },
    rules: [
      {
        input:   '#fileName',
        message: 'File name is required!',
        action:  'keyup, blur',
        rule:    function (input) {
          $('#saveButton').jqxButton ({disabled: !input.val ().length});
          return true;
        },
      },
      {
        input:   '#fileName',
        message: 'File name must be between 1 and 40 characters!',
        action:  'keyup, blur',
        rule:    function (input) {
          var name = input.val ();
          var result = ((name.length < 1) || (name.length > 40)) ? false : true;
          $('#saveButton').jqxButton ({disabled: !result});
          return result;
        },
      },
      {
        input:   '#fileName',
        message: 'File name may only contain the characters A-Z, a-z, 0-9, underscore, dash, and period',
        action:  'keyup, blur',
        rule:    function (input) {
          var result = input.val ().match (/[^A-Za-z0-9_\-\.]/) ? false : true;
          $('#saveButton').jqxButton ({disabled: !result});
          return result;
        },
      }
    ]
  });

  //
  //
  //
  App.refreshMatchData = function () {
    App.socket.emit ('match:name', function (data) {
      App.resetValue = data.matchname_stripped;
      $('#matchname').text (data.matchname);
      $('#fileName').jqxInput ('val', data.matchname_stripped);
      $('#saveForm').jqxValidator ('hideHint', '#fileName');
      $('#saveButton').jqxButton ({disabled: false});
    });
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.refreshMatchData ();
  };

  App.socketDisconnect = function () {
    $('#saveForm').jqxValidator ('hideHint', '#fileName');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.refreshMatchData);
  App.socket.emit ('log:log', {'msg': 'File->File->Save Match'});
});
