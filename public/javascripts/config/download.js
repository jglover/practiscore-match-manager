/* global io */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.setFields = function (config) {
    $('#ex-cpcSavePINs').jqxCheckBox (config._download.cpcSavePINs ? 'check' : 'uncheck');
    $('#ex-cpcFixNameCase').jqxCheckBox (config._download.cpcFixNameCase ? 'check' : 'uncheck');
    $('#ex-ssuSaveCredentials').jqxCheckBox (config._download.ssuSaveCredentials ? 'check' : 'uncheck');
    $('#ex-ssuSaveMatchID').jqxCheckBox (config._download.ssuSaveMatchID ? 'check' : 'uncheck');
    $('#ex-ssuFixNameCase').jqxCheckBox (config._download.ssuFixNameCase ? 'check' : 'uncheck');
    $('#ec-downloadUrlSC').jqxInput ('val', config._download.urlSC);
    $('#ec-downloadUrlUSPSA').jqxInput ('val', config._download.urlUSPSA);
    $('#ex-downloadVerifyUSPSA').jqxCheckBox (config._download.verifyUSPSA ? 'check' : 'uncheck');
    $('#ex-downloadAddVerifiedUSPSA').jqxCheckBox (config._download.addVerifiedUSPSA ? 'check' : 'uncheck');
  };

  App.validateURL = function (input, callback) {
    App.socket.emit ('config:validate:url', {url: input.val ()}, function (data) {
      callback (data.isURL);
    });
  };

  $('#ex-cpcSavePINs').jqxCheckBox ();
  $('#ex-cpcFixNameCase').jqxCheckBox ();
  $('#ex-ssuSaveCredentials').jqxCheckBox ();
  $('#ex-ssuSaveMatchID').jqxCheckBox ();
  $('#ex-ssuFixNameCase').jqxCheckBox ();
  $('#ec-downloadUrlSC').jqxInput ({width: 520, height: 23, maxLength: 100});
  $('#ec-downloadUrlUSPSA').jqxInput ({width: 520, height: 23, maxLength: 100});
  $('#ex-downloadVerifyUSPSA').jqxCheckBox ();
  $('#ex-downloadAddVerifiedUSPSA').jqxCheckBox ();
  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-practiscore']").on ('blur', function () {
    $(this).jqxValidator ('validate');
  });

  $('#ec-resetButton').on ('click', function () {
    App.setFields (App.config);
    $('#msg, #errmsg').hide ();
    $('#inputFields').jqxValidator ('hide');
  });

  $('#ec-saveButton').on ('click', function () {
    $('#msg, #errmsg').hide ();
    $('#inputFields').jqxValidator ('validate', function (isValid) {
      if (isValid) {
        App.config._download.cpcSavePINs = $('#ex-cpcSavePINs').jqxCheckBox ('val');
        App.config._download.cpcFixNameCase = $('#ex-cpcFixNameCase').jqxCheckBox ('val');
        App.config._download.ssuSaveCredentials = $('#ex-ssuSaveCredentials').jqxCheckBox ('val');
        App.config._download.ssuSaveMatchID = $('#ex-ssuSaveMatchID').jqxCheckBox ('val');
        App.config._download.ssuFixNameCase = $('#ex-ssuFixNameCase').jqxCheckBox ('val');
        App.config._download.urlSC = $('#ec-downloadUrlSC').jqxInput ('val');
        App.config._download.urlUSPSA = $('#ec-downloadUrlUSPSA').jqxInput ('val');
        App.config._download.verifyUSPSA = $('#ex-downloadVerifyUSPSA').jqxCheckBox ('val');
        App.config._download.addVerifiedUSPSA = $('#ex-downloadAddVerifiedUSPSA').jqxCheckBox ('val');

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
      }
    });
  });

  $('#inputFields').jqxValidator ({
    focus: true,
    closeOnClick: false,
    rules: [
      {
        input:    '#ec-downloadUrlSC',
        position: 'bottom',
        message:  'A URL is required',
        action:   'blur',
        rule:     'required',
      }, {
        input:    '#ec-downloadUrlSC',
        position: 'bottom',
        message:  'A valid URL is required',
        action:   'blur',
        rule:     function (input, commit) {
          App.validateURL (input, function (isURL) {
            commit (isURL);
          });
        },
      }, {
        input:    '#ec-downloadUrlUSPSA',
        position: 'bottom',
        message:  'A URL is required',
        action:   'blur',
        rule:     'required',
      }, {
        input:    '#ec-downloadUrlUSPSA',
        position: 'bottom',
        message:  'A valid URL is required',
        action:   'blur',
        rule:     function (input, commit) {
          App.validateURL (input, function (isURL) {
            commit (isURL);
          });
        },
      },
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

  App.socket.emit ('log:log', {'msg': 'Config->Download'});
});
