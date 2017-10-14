/* global io */
/* global _:false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
    menuautoopen: ($('#pmmui').attr ('menuautoopen') === "true") ? true : false,
    openMenus: {},
  };

  //
  //  Disabled items need to be ID'ed before jqxMenu runs
  //
  $('[disable-menu-item]').each (function (index) {
    $(this).attr ('id', 'disable-menu-item-' + index);
  });

  $('#jqxMenu').jqxMenu ({
    theme: pmmui.theme,
    clickToOpen: pmmui.menuautoopen,
    width: new $.jqx.response ().viewPort.width - 12,
    height: 30,
    minimizeWidth: null,
    showTopLevelArrows: false, // true,
    keyboardNavigation: true
  });

  $('#jqxMenuAction').css ('float', 'right');

  //
  //  FIXME: Temporary fix to get section name from #section div,
  //  then remove the section division.
  //
  $('#jqxMenuAction').html ($('#section').html ());
  $('#jqxMenu').jqxMenu ('disable', 'jqxMenuAction', true);
  $('#section').remove ();

  //
  //  Hide all match-type specific entries, then enable any that are
  //  applicable for this match type.
  //
  $('[matchtype]').hide ();
  $('[matchtype~=' + $('#menu_matchtype').val ()).show ();

  //
  //  Disable any menu items that have the disable-menu-item attribute
  //
  $('[disable-menu-item]').each (function () {
    $('#jqxMenu').jqxMenu ('disable', $(this).attr ('id'), true);
    $(this).find ('a').removeAttr ('href');
  });

  $('#jqxMenu').on ('itemclick', function (event) {
    var displayHelp = function (text) {
      $('#jqxHelpWindow').jqxWindow ({
        showCollapseButton: true,
        resizable: true,
        draggable: true,
        maxHeight: 400,
        maxWidth: 700,
        minHeight: 200,
        minWidth: 200,
        height: 300,
        width: 500,
      });
      $('#jqxHelpWindow').jqxWindow ('setTitle', 'Help');
      $('#jqxHelpWindow').jqxWindow ('setContent', text);
      $('#jqxHelpWindow').jqxWindow ('open');
    };

    if (event.args.id === 'jqxMenuHelpPage') {
      $('#jqxMenu').jqxMenu ('closeItem', 'jqxMenuHelp');
      var element = $('#help-page-id');
      if ($(element).length) {
        var helpid = $(element).text ();
        $.ajax ({
          url: 'http://' + window.location.host + '/ajax/help',
          type: 'GET',
          dataType: 'html',
          data: {helpid: helpid},
          success: function (data) {
            displayHelp (data);
          },
          error: function (e) {
            displayHelp ('<p>Eeek! An error occurred trying to display this page.</p><pre>' + e + '</pre>');
            console.log ('Fail :(');
            console.dir (e);
          },
        });
      } else
        displayHelp ('<p>Sorry, no help available for this page.</p>');
    }
  });

  $('#jqxMenu').on ('shown', function (event) {
    if (event && event.args && (event.args.level === 0) && event.args.id)
      pmmui.openMenus [event.args.id] = event.args.id;
  });

  $('#jqxMenu').on ('closed', function (event) {
    if (event && event.args && event.args.id && pmmui.openMenus [event.args.id])
      delete pmmui.openMenus [event.args.id];
  });

  var socket = io.connect ();

  socket.on ('reload', function () {
    _.each (pmmui.openMenus, function (menuid) {
       $('#jqxMenu').jqxMenu ('closeItem', menuid); // menutext);
    });
    socket.emit ('match:type', function (data) {
      $('[matchtype]').hide ();
      $('[matchtype~=' + data.matchtype_pmm).show ();
    });
  });

  socket.on ('menurefresh', function () {
    socket.emit ('match:type', function (data) {
      console.log ('Updating menu to match type %s (menurefresh)', data.matchtype_pmm);
      $('[matchtype]').hide ();
      $('[matchtype~=' + data.matchtype_pmm).show ();
    });
  });
});
