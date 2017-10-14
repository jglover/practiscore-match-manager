/* global io */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};
  var themes = [
    { value: 'darkblue',      label: 'Dark Blue'   },
    { value: 'energyblue',    label: 'Energy Blue' },
    { value: 'android',       label: 'Android' },
    { value: 'arctic',        label: 'Artic' },
    { value: 'black',         label: 'Black' },
    { value: 'blackberry',    label: 'Blackberry' },
    { value: 'bootstrap',     label: 'Bootstrap' },
    { value: 'classic',       label: 'Classic' },
    { value: 'fresh',         label: 'Fresh' },
    { value: 'glacier',       label: 'Glacier' },
    { value: 'highcontrast',  label: 'High Contrast' },
    { value: 'metro',         label: 'Metro' },
    { value: 'metrodark',     label: 'Metro Dark' },
    { value: 'mobile',        label: 'Mobile' },
    { value: 'office',        label: 'Office' },
    { value: 'orange',        label: 'Orange' },
    { value: 'shinyblack',    label: 'Shiny Black' },
    { value: 'summer',        label: 'Summer' },
    { value: 'ui-darkness',   label: 'Darkness' },
    { value: 'ui-le-frog',    label: 'Le Frog' },
    { value: 'ui-lightness',  label: 'Lightness' },
    { value: 'ui-overcast',   label: 'Overcast' },
    { value: 'ui-redmond',    label: 'Redmond' },
    { value: 'ui-smoothness', label: 'Smoothness' },
    { value: 'ui-start',      label: 'Start' },
    { value: 'ui-sunny',      label: 'Sunny' },
    { value: 'web',           label: 'Web' },
    { value: 'windowsphone',  label: 'Windows Phone' },
  ];

  var themesSource = {
    datatype: 'array',
    datafields: [
      { name: 'value', type: 'string' },
      { name: 'label', type: 'string' }
    ],
    localdata: themes
  };

  var themesAdapter = new $.jqx.dataAdapter (themesSource, {
    autoBind: true
  });

  App.setFields = function (config) {
    $('#ex-pmmuiMenuAutoOpen').jqxCheckBox (config._pmmui.menuautoopen ? 'check' : 'uncheck');
    $('#ex-pmmuiInlineEditing').jqxCheckBox (config._pmmui.inlineediting ? 'check' : 'uncheck');
    $('#ex-pmmuiUseCategoryList').jqxCheckBox (config._pmmui.usecategorylist ? 'check' : 'uncheck');
    $('#ec-pmmuiTheme').jqxDropDownList ('selectIndex', _.findIndex (themes, 'value', config._pmmui.theme));
  };

  $("[id^='ex-']").each (function () {
    $(this).jqxCheckBox ();
  });
  $('#ec-pmmuiTheme').jqxDropDownList ({width: 140, height: 22, autoDropDownHeight: true, source: themesAdapter, selectedIndex: 0});

  $('#ec-resetButton').jqxButton ({width: 65});
  $('#ec-saveButton').jqxButton ({width: 65});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-pmmui']").on ('blur', function () {
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
      App.config._pmmui.menuautoopen = $('#ex-pmmuiMenuAutoOpen').jqxCheckBox ('val');
      App.config._pmmui.inlineediting = $('#ex-pmmuiInlineEditing').jqxCheckBox ('val');
      App.config._pmmui.usecategorylist = $('#ex-pmmuiUseCategoryList').jqxCheckBox ('val');
      App.config._pmmui.theme = $('#ec-pmmuiTheme').jqxDropDownList ('getSelectedItem').value;

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

  App.socket.emit ('log:log', {'msg': 'Config->UI'});
});
