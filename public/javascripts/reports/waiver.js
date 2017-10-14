/* global io */
/* global _: false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.waiverText = [
    '<div style="text-align: center;">RIVER BEND GUN CLUB RANGE RELEASE FORM</div>',
    'In consideration of the undersigned being allowed to use the facilities of River Bend Gun Club, Inc., the undersigned does hereby release, discharge, waive, hold harmless and covenant not to sue River Bend Gun Club, Inc., its officers, directors, agents, representatives, employees, or volunteers, from any and all liability to the undersigned, the heirs, executors, administrators, successors, assigns, and next of kin to the undersigned, for any loss, damages or injury, including death, to the undersigned\'s person or property, or for any other consequences to the undersigned arising from, out of, or as a result of use of the facilities of River Bend Gun Club, Inc., by the undersigned.',
    'The undersigned further consents to and authorizes all emergency medical treatment to the undersigned as may be deemed appropriate under existing circumstances at the time of any injury to the undersigned, and to transport the undersigned to the nearest emergency medical facility, by whatever means may be deemed appropriate under the circumstances.',
    'The undersigned further consents to the taking, making or recording of pictures, movies, videotapes or other images of the undersigned\'s likeness or voice in any manner incidental to use of the facilities, and to the publishing, broadcasting or display of such likeness or voice without any compensation therefore.',
  ];

  //
  //  For any shooters that are deleted, remove any trace of them from
  //  the match JSON.
  //
  var createWaiver = function (match) {
    var shooters = _.sortByAll (_.filter (match.m.match_shooters, {'sh_del': false}), ['sh_ln', 'sh_fn'], ['asc', 'asc']);
    var div =  $('<div/>');
    var waiverDiv = $('<div/>').addClass ('waiver-text page-break');
    var tableDiv = $('<div/>');
    var table, thead, tbody, tr;
    var rowNumber;
    var totalRows = shooters.length + (25 - Math.floor (shooters.length % 25));

    _.each (App.waiverText, function (t) {
      waiverDiv.append ($('<p/>').html (t));
    });

    for (rowNumber = 0; rowNumber < totalRows; rowNumber++) {
      if (rowNumber % 25 === 0) {
        if (table)
          tableDiv.append (table.append (tbody));

        table = $('<table/>)').addClass ('page-break');
        thead = $('<thead/>)');
        tbody = $('<tbody/>)');
        tr = $('<tr/>').addClass ('header');

        tr.append ($('<th/>').text ('#').addClass ('th-number'));
        tr.append ($('<th/>').text ('Last Name').addClass ('th-lastname'));
        tr.append ($('<th/>').text ('First Name').addClass ('th-firstname'));
        tr.append ($('<th/>').text ('USPSA').addClass ('th-uspsanum'));
        tr.append ($('<th/>').text ('RBGC').addClass ('th-rbgcmember'));
        tr.append ($('<th/>').text ('Junior').addClass ('th-junior'));
        tr.append ($('<th/>').text ('Signature').addClass ('th-signature'));

        thead.append (tr);
        table.append (thead);
      }

      tr = $('<tr/>').addClass ((rowNumber % 2 === 0) ? 'even' : 'odd');
      tr.append ($('<td/>').text (rowNumber + 1).addClass ('td-number'));
      tr.append ($('<td/>').text ((rowNumber < shooters.length) ? shooters [rowNumber].sh_ln : '').addClass ('td-lastname'));
      tr.append ($('<td/>').text ((rowNumber < shooters.length) ? shooters [rowNumber].sh_fn : '').addClass ('td-firstname'));
      tr.append ($('<td/>').text ((rowNumber < shooters.length) ? shooters [rowNumber].sh_id : '').addClass ('td-uspsanum'));
      tr.append ($('<td/>').text (' ').addClass ('td-rbgcmember'));
      tr.append ($('<td/>').text (' ').addClass ('td-junior'));
      tr.append ($('<td/>').text (' ').addClass ('td-signature'));
      tbody.append (tr);

      if (rowNumber === totalRows - 1)
        tableDiv.append (table.append (tbody));
    }

    div.append (waiverDiv);
    div.append (tableDiv);

    $('#waiver').append (div);
  };

  $('[controltype=button]').each (function () {
    $(this).jqxButton ({
      width: $(this).attr ('button-width'),
    });
  });

  $('#button-print-preview').on ('click', function () {
    window.print ();
  });

  //
  //
  //
  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.socket.emit ('match:get', {options: {match: true}}, function (data) {
      App.matchData = data.matchData;
      $('#matchname').text (data.matchData.m.match_name);

      createWaiver (data.matchData);
    });
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.matchUpdated = function () {
    App.matchDataChanged = true;
  };

  App.reload = function () {
    alert ('New match loaded, reloading projection page!');
    window.location.href = 'http://' + window.location.host + '/reports/waiver';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Reports->Waiver'});
});
