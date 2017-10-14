/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.setFields = function (config) {
    $('#ex-deviceDisplayHeaders').jqxCheckBox (config._debug.deviceDisplayHeaders ? 'check' : 'uncheck');
    $('#ex-deviceDisplayState').jqxCheckBox (config._debug.deviceDisplayState ? 'check' : 'uncheck');
    $('#ex-deviceSaveData').jqxCheckBox (config._debug.deviceSaveData ? 'check' : 'uncheck');
    $('#ex-mergeDetails').jqxCheckBox (config._debug.mergeDetails ? 'check' : 'uncheck');
    $('#ex-mergeDeepDiff').jqxCheckBox (config._debug.mergeDeepDiff ? 'check' : 'uncheck');
  };

  $('[controltype="checkbox"]').jqxCheckBox ();
  $(':button').jqxButton ({width: 65});

  $('#ec-resetButton').on ('click', function () {
    App.setFields (App.config);
    $('#msg, #errmsg').hide ();
    $('#inputFields').jqxValidator ('hide');
  });

  $('#ec-saveButton').on ('click', function () {
    $('#inputFields').jqxValidator ('validate');
    $('#msg, #errmsg').hide ();
  });

  $('#inputFields').jqxValidator ({
    focus: true,
    closeOnClick: false,
    onSuccess: function () {
      App.config._debug.deviceDisplayHeaders = $('#ex-deviceDisplayHeaders').jqxCheckBox ('val');
      App.config._debug.deviceDisplayState = $('#ex-deviceDisplayState').jqxCheckBox ('val');
      App.config._debug.deviceSaveData = $('#ex-deviceSaveData').jqxCheckBox ('val');
      App.config._debug.mergeDetails = $('#ex-mergeDetails').jqxCheckBox ('val');
      App.config._debug.mergeDeepDiff = $('#ex-mergeDeepDiff').jqxCheckBox ('val');

      App.socket.emit ('config:validate', {config: App.config}, function (data) {
        if (!data.err) {
          App.socket.emit ('config:save', {config: App.config}, function (data) {
            if (!data.err) {
              $('#msg').html ('Configuration updated').show ();
            } else
              $('#errmsg').html (data.err).show ();
          });
        } else
          $('#errmsg').html (data.err).show ();
      });
    },
    rules: [
    ]
  });

  App.socket = io.connect ();

  App.socket.on ('connect', function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.socket.emit ('config:request', function (data) {
      if (!data.err) {
        App.config = data.config;
        App.setFields (App.config);
      }
    });
  });

  App.socket.on ('disconnect', function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
    $('#inputFields').jqxValidator ('hide');
  });

  App.socket.emit ('log:log', {'msg': 'Config->Debug'});
});
