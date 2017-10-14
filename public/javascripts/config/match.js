/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.setFields = function (config) {
    $('#ex-matchUpdateAutofill').jqxCheckBox (config._match.updateAutofill ? 'check' : 'uncheck');
    $('#ex-matchNameCaseDB').jqxCheckBox (config._match.nameCaseDB ? 'check' : 'uncheck');
    $('#ex-matchNameCaseFile').jqxCheckBox (config._match.nameCaseFile ? 'check' : 'uncheck');
    $('#ex-matchNameCaseImport').jqxCheckBox (config._match.nameCaseImport ? 'check' : 'uncheck');
    $('#ex-matchNameCaseDownload').jqxCheckBox (config._match.nameCaseDownload ? 'check' : 'uncheck');
    $('#ex-matchNameCaseSync').jqxCheckBox (config._match.nameCaseSync ? 'check' : 'uncheck');
  };

  $('#ex-matchUpdateAutofill').jqxCheckBox ();
  $('#ex-matchNameCaseDB').jqxCheckBox ();
  $('#ex-matchNameCaseFile').jqxCheckBox ();
  $('#ex-matchNameCaseImport').jqxCheckBox ();
  $('#ex-matchNameCaseDownload').jqxCheckBox ();
  $('#ex-matchNameCaseSync').jqxCheckBox ();

  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $('#ec-resetButton').on ('click', function () {
    App.setFields (App.config);
    $('#inputFields').jqxValidator ('hide');
    $('#msg, #errmsg').hide ();
  });

  $('#ec-saveButton').on ('click', function () {
    $('#inputFields').jqxValidator ('validate');
    $('#msg, #errmsg').hide ();
  });

  $('#inputFields').jqxValidator ({
    focus: true,
    closeOnClick: false,
    onSuccess: function () {
      App.config._match.updateAutofill = $('#ex-matchUpdateAutofill').jqxCheckBox ('val');
      App.config._match.nameCaseDB = $('#ex-matchNameCaseDB').jqxCheckBox ('val');
      App.config._match.nameCaseFile = $('#ex-matchNameCaseFile').jqxCheckBox ('val');
      App.config._match.nameCaseImport = $('#ex-matchNameCaseImport').jqxCheckBox ('val');
      App.config._match.nameCaseDownload = $('#ex-matchNameCaseDownload').jqxCheckBox ('val');
      App.config._match.nameCaseSync = $('#ex-matchNameCaseSync').jqxCheckBox ('val');

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

  App.socket.emit ('log:log', {'msg': 'Config->Match'});
});
