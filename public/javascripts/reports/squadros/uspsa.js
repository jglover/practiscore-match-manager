/* global io, sprintf */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.createReport = function (squads) {
    var squadList = $('<ul/>').addClass ('squad-list');

    _.each (squads, function (squad, squadNumber) {
      var squadItem = $('<li/>').addClass ('squad-item nobreak');
      var shooterList = $('<ol/>').addClass ('shooter-list');
      var totalCount = 0;
      var roCount = 0;

      _.each (_.sortBy (squad, 'sh_ln'), function (shooter) {
        var shooterItem = $('<li/>').addClass ('shooter-item');

        shooterItem.html (sprintf ('%s, %s%s', shooter.sh_ln, shooter.sh_fn, shooter.sh_id.length ? sprintf (' (%s)', shooter.sh_id) : ''));

        if (shooter.sh_del)
          shooterItem.addClass ('sh-deleted');
        else if (shooter.sh_dq)
          shooterItem.addClass ('sh-dq');
        else if (shooter.sh_iscro) {
          shooterItem.addClass ('sh-cro');
          roCount++;
        } else if (shooter.sh_isro) {
          shooterItem.addClass ('sh-ro');
          roCount++;
        }

        if (!shooter.sh_del)
          totalCount++;

        shooterList.append (shooterItem);
      });

      squadItem.html (sprintf ('Squad %s (%s w/ %s ROs)', squadNumber, totalCount, roCount));
      squadItem.append (shooterList);

      squadList.append (squadItem);
    });

    $('#report').empty ().append (squadList);
  };

  App.refreshMatchData = function () {
    App.socket.emit ('match:get', {options: {match: true}}, function (data) {
      var shooters = data.matchData.m.match_shooters || {};
      $('#matchname').text (data.matchData.m.match_name);

      if (!$('#checkbox-includedeleted').jqxCheckBox ('checked'))
        shooters = _.filter (shooters, 'sh_del', false);

      App.socket.emit ('rolist:get:uspsa:records', function (data) {
        var squads = {};
        var roentry;
        var rolist = _.indexBy (data.records, 'uspsa_num');

        _.each (shooters, function (shooter) {
          if ((roentry = rolist [shooter.sh_id])) {
            if (roentry.certification === 'CRO')
              shooter.sh_iscro = true;
            else if (roentry.certification === 'RO')
              shooter.sh_isro = true;
          }

          squads [shooter.sh_sqd] = squads [shooter.sh_sqd] || [];
          squads [shooter.sh_sqd].push (shooter);
        });

        App.createReport (squads);
      });
    });
  };

  $('[controltype=checkbox]').jqxCheckBox ();
  $('[controltype=checkbox]').each (function () {
    $(this).on ('click', function () {
      App.refreshMatchData ();
    });
  });

  $('[controltype=button]').each (function () {
    $(this).jqxButton ({
      width: $(this).attr ('button-width'),
    });
  });

  $('#button-print-preview').off ().on ('click', function () {
    window.print ();
  });

  //
  //
  //
  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.refreshMatchData ();
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/reports/squadros';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {'msg': 'Squad RO/CRO Report (USPSA)'});
});
