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
    var allSquads = $(document.createDocumentFragment ());
    var highlight = $('#checkbox-highlight').jqxCheckBox ('checked');
    var squadperpage = $('#checkbox-squadperpage').jqxCheckBox ('checked');

    _.each (squads, function (squad, squadNumber) {
      if ($('[rtlcheckbox=' + squadNumber + ']').jqxCheckBox ('checked') === false)
        return;

      var div = $('<div/>').addClass ('nobreak');
      var table = $('<table/>').addClass ('table-squad');
      var thead = $('<thead/>');
      var tbody = $('<tbody/>');
      var tr = $('<tr/>');

      _.each (['Comp#','Name','USPSA#','Division','Class','Age','Lady','Law','Mil','Frn'], function (f) {
        tr.append ($('<th/>').html (f).addClass ('header-' + f.toLowerCase ().replace (/[^a-z]/g, '')));
      });

      thead.append (tr);

      _.each (_.sortBy (squad, 'sh_ln'), function (shooter, index) {
        tr = $('<tr/>');

        if (highlight)
          tr.addClass ((index % 2) ? 'row-odd' : 'row-even');

        tr.append ($('<td/>').html (shooter.sh_num).addClass ('field-comp'));
        tr.append ($('<td/>').html (sprintf ('%s, %s', shooter.sh_ln, shooter.sh_fn)).addClass ('field-name'));
        tr.append ($('<td/>').html (shooter.sh_id).addClass ('field-uspsa'));
        tr.append ($('<td/>').html (shooter.sh_dvpnice).addClass ('field-division'));
        tr.append ($('<td/>').html (shooter.sh_grd).addClass ('field-class'));
        tr.append ($('<td/>').html (shooter.sh_agenice).addClass ('field-age'));
        tr.append ($('<td/>').append (sprintf ('<input type="checkbox" class="nochange"%s/>', (shooter.sh_gen === 'FEMALE') ? ' checked' : '')).addClass ('field-lady'));
        tr.append ($('<td/>').append (sprintf ('<input type="checkbox" class="nochange"%s/>', shooter.sh_law ? ' checked' : '')).addClass ('field-law'));
        tr.append ($('<td/>').append (sprintf ('<input type="checkbox" class="nochange"%s/>', shooter.sh_mil ? ' checked' : '')).addClass ('field-mil'));
        tr.append ($('<td/>').append (sprintf ('<input type="checkbox" class="nochange"%s/>', shooter.sh_frn ? ' checked' : '')).addClass ('field-frn'));

        tbody.append (tr);
      });

      table.append (thead);
      table.append (tbody);

      div.html (sprintf ('Squad No: <span class="field-squadno">%s</span>', squadNumber));
      div.append ($('<hr/>'));
      div.append (table);
      div.append ($('<p/>'));

      allSquads.append (div);

      if (squadperpage)
        allSquads.append ($('<div/>').addClass ('page-break'));
    });

    $('#report').empty ().append (allSquads);

    $('.nochange').off ().on ('click', function () {
      return false;
    });
  };

  App.refreshMatchData = function () {
    App.socket.emit ('match:get', {options: {match: true, lookups: true}}, function (data) {
      var shooters = data.matchData.m.match_shooters || {};
      var divisions = data.matchData.l.divisions;
      var ages = data.matchData.l.ages_export;
      var pfs = data.matchData.l.powerfactors;
      var fragment = $(document.createDocumentFragment ());
      var tr;
      $('#matchname').text (data.matchData.m.match_name);

      App.squads = {};

      if (!$('#checkbox-includedeleted').jqxCheckBox ('checked'))
        shooters = _.filter (shooters, 'sh_del', false);

      _.each (shooters, function (shooter) {
        shooter.sh_dvpnice = divisions [shooter.sh_dvp] || shooter.sh_dvp;
        shooter.sh_agenice = ages [shooter.sh_age].replace (/Super Senior/, 'Spr Snr');
        shooter.sh_pfnice = pfs [shooter.sh_pf] || shooter.sh_pf;

        if ((shooter.sh_dvp !== 'PROD') && (shooter.sh_dvp !== 'CO'))
          shooter.sh_dvpnice += (shooter.sh_pf === 'MAJOR' ? '+' : '-');

        App.squads [+shooter.sh_sqd] = App.squads [+shooter.sh_sqd] || [];
        App.squads [+shooter.sh_sqd].push (shooter);
      });

      _.each (_.sortBy (_.keys (App.squads), function (n) {return +n;}), function (squadno, index) {
        if (index % 5 === 0) {
          fragment.append (tr);
          tr = $('<tr/>').addClass ('squadselect-cbrow');
        }

        tr.append ($('<td/>')
                   .attr ('rtlcheckbox', squadno)
                   .append ('<span class="rtltext">' + squadno + '</span>')
                  );
      });

      if (_.keys (App.squads).length % 5) {
        for (var i = _.keys (App.squads).length % 5; i < 5; i++)
          tr.append ($('<td/>'));
      }

      fragment.append (tr);

      $('#squadselect').hide ();
      $('.squadselect-cbrow').remove ();
      fragment.insertBefore ($('#squadselect-buttons'));

      $('[rtlcheckbox]').each (function () {
        $(this).jqxCheckBox ({
          rtl: true,
          checked: true,
        });
      });

      $('#squadselect').show ();
    });
  };

  $('[controltype=checkbox]').jqxCheckBox ();

  $('#checkbox-highlight, #checkbox-squadperpage').jqxCheckBox ({
    checked: true,
  });

  $('#checkbox-includedeleted').each (function () {
    $(this).on ('click', function () {
      App.refreshMatchData ();
    });
  });

  $('[controltype=button]').each (function () {
    $(this).jqxButton ({
      width: $(this).attr ('button-width'),
    });
  });

  $('#button-screen').on ('click', function () {
    App.createReport (App.squads);
    var html =
      '<html lang="en"><head>' +
        document.head.innerHTML +
      '</head><body><div id="report">' +
        $('#report').html () +
      '</div></body></html>';

    window.open ().document.write (html);
  });

  $('#button-print-preview').on ('click', function () {
    App.createReport (App.squads);
    $('#report').addClass ('printing');
    window.print ();
  });

  $('#button-select-all').on ('click', function () {
    $('[rtlcheckbox]').each (function () {
      $(this).jqxCheckBox ({
        checked: true,
      });
    });
  });

  $('#button-select-none').on ('click', function () {
    $('[rtlcheckbox]').each (function () {
      $(this).jqxCheckBox ({
        checked: false,
      });
    });
  });

  $('#button-select-invert').on ('click', function () {
    $('[rtlcheckbox]').each (function () {
      $(this).jqxCheckBox ({
        checked: !$(this).jqxCheckBox ('checked'),
      });
    });
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
    window.location.href = 'http://' + window.location.host + '/reports/squad';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {'msg': 'Squad Report (USPSA)'});
});
