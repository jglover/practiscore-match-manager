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
    datatype: "array",
    datafields: [
      { name: 'pmm',  type: 'string' },
      { name: 'ps',   type: 'string' },
      { name: 'name', type: 'string' },
    ],
    localdata: [],
  };

  var matchtypesAdapter = new $.jqx.dataAdapter (matchtypesSource);

  //
  //  Ye olde main...
  //
  $('#matchTypesDDL').jqxDropDownList ({
    disabled: true,
    width: 160,
    height: 25,
    displayMember: 'name',
    valueMember: 'ps',
    autoDropDownHeight: true,
  });

  $('#matchTypesDDL').on ('bindingComplete', function () {
    $('#matchTypesDDL').jqxDropDownList ({disabled: false});
    $('#matchTypesDDL').jqxDropDownList ('selectIndex', _.findIndex (matchtypesAdapter.records, 'ps', App.config._config.defaultMatchType));
    $('#newmatchButton').jqxButton ({disabled: false});
  });

  $('#newmatchButton').jqxButton ({
    disabled: true,
    width: 150
  });

  $('#newmatchButton').on ('click', function (e) {
    var matchtype = $('#matchTypesDDL').jqxDropDownList ('getSelectedItem').value;
    this.blur ();
    e.preventDefault ();
    App.socket.emit ('match:create', {matchtype: matchtype}, function (data) {
      if (data.err)
        $('#messageDiv').html (data.err);
      else {
        $('#messageDiv').html ('<b>New match created</b>');
        App.getMatchData ();
      }
    });
  });

  //
  //
  //
  App.getMatchData = function () {
    // FIXME: Should check some flag or another to display message
    // if (data.matchData.v.edited)
    $('#notsavedDiv').show ();
    // else
    //   $('#notsavedDiv').hide ();

    App.socket.emit ('match:name', function (data) {
      $('#matchname').text (data.matchname);
    });

    App.socket.emit ('config:request', function (data) {
      App.config = data.config;

      App.socket.emit ('system:supportedmatchtypes', function (mdata) {
        matchtypesSource.localdata = mdata.supportedmatchtypes;
        $('#matchTypesDDL').jqxDropDownList ({source: matchtypesAdapter});
      });
    });
  };

  //
  //
  //
  App.socketConnect = function () {
    $('#messageDiv').html ('');
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.getMatchData ();
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.getMatchData);
  App.socket.on ('reload', App.getMatchData);
  App.socket.emit ('log:log', {'msg': 'File->Create New Match'});
});
