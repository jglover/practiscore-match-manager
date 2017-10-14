/* global io */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  var matchtypesSource = {
    localdata: [],
    datatype: 'array',
    datafields: [
      { name: 'pmm',  type: 'string' },
      { name: 'ps',   type: 'string' },
      { name: 'name', type: 'string' },
    ],
  };

  var matchtypesAdapter = new $.jqx.dataAdapter (matchtypesSource);

  App.setFields = function (config) {
    $('#ex-startupLoadLastMatch').jqxCheckBox (config._config.loadLastMatch ? 'check' : 'uncheck');
    $('#ec-startupDefaultMatchType').jqxDropDownList ('selectIndex', _.findIndex (matchtypesAdapter.records, {'ps': config._config.defaultMatchType}));
  };

  $('#ex-startupLoadLastMatch').jqxCheckBox ();
  $('#ec-startupDefaultMatchType').jqxDropDownList ({
    width: 140,
    height: 22,
    displayMember: 'name',
    valueMember: 'ps',
    autoDropDownHeight: true,
  });

  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-startup']").on ('blur', function () {
    $(this).jqxValidator ('validate');
  });

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
      App.config._config.loadLastMatch = $('#ex-startupLoadLastMatch').jqxCheckBox ('val');
      App.config._config.defaultMatchType = $('#ec-startupDefaultMatchType').jqxDropDownList ('getSelectedItem').value;

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

    App.socket.emit ('system:supportedmatchtypes', function (mdata) {
      matchtypesSource.localdata = mdata.supportedmatchtypes;
      $('#ec-startupDefaultMatchType').jqxDropDownList ({source: matchtypesAdapter});
    });

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

  App.socket.emit ('log:log', {'msg': 'Config->Startup'});
});
