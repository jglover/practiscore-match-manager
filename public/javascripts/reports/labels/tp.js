/* global io, pmelib */
/* global _: false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  //
  //  page, label, columns and rows are in pt, except for label.radius
  //  geometry is number of label across, down and on each page
  //
  var labelSpec = {
    //
    //  Avery 5160 or equivalent. 8.5" x 11" sheet with 30 labels in a 3
    //  column, 10 row format. The sheet is 612pt x 792pt, with a usable height
    //  of 760pt.  Each label is 1" high x 2.625" wide (72pt x 189pt)
    //
    5160: {
      page: {
        width:  612,
        height: 760,
      },
      label: {
        width:  189,
        height:  72,
        radius:   7
      },
      geometry: {
        across:  3,
        down:   10,
        page:   30
      },
      columns: [
        13, 211, 410
      ],
      rows: [
        33, 105, 177, 249, 321, 393, 465, 537, 609, 681
      ],
      format: {
        competitor: function (shooter, stageName, stageNumber) {
          return [
            { html: 'Stage ' + stageNumber,    attrs: {x:   '7.2pt', y: '14.4pt', 'text-anchor': 'start',  style: 'font-size: smaller' }},
            { html: 'Comp #' + shooter.sh_pos, attrs: {x:  '95.0pt', y: '14.4pt', 'text-anchor': 'middle', style: 'font-size: smaller' }},
            { html: 'Squad ' + shooter.sh_sqd, attrs: {x: '182.0pt', y: '14.4pt', 'text-anchor': 'end',    style: 'font-size: smaller' }},
            { html: shooter.sh_fnln,           attrs: {x:  '95.0pt', y: '31.0pt', 'text-anchor': 'middle', style: 'font-weight: bold'  }},
            { html: shooter.sh_dvp,            attrs: {x:  '95.0pt', y: '48.0pt', 'text-anchor': 'middle', style: 'font-weight: bold'  }},
            { html: stageName,                 attrs: {x:  '95.0pt', y: '65.0pt', 'text-anchor': 'middle', style: 'font-size: smaller' }},
          ];
        },
        verification: function (shooter) {
          var categories = [];
          var line = [];

          if (shooter.sh_mil) categories.push ('Military');
          if (shooter.sh_law) categories.push ('Law Enforcement');
          if (shooter.sh_frn) categories.push ('Foreign');

          line.push ('[' + shooter.sh_pos + '] ' + shooter.sh_fnln + ' ' + shooter.sh_id);
          line.push (shooter.sh_dvp + ' (' + shooter.sh_grd + ') (' + shooter.sh_sqd + ') (' + shooter.sh_st + ')');
          line.push (shooter.sh_gen + ', ' + shooter.sh_age);
          line.push (categories.join (', '));

          return [
            { html: line [0], attrs: {x: '7.2pt', y: '19.0pt', 'text-anchor': 'start', style: 'font-size: 10pt' }},
            { html: line [1], attrs: {x: '7.2pt', y: '33.0pt', 'text-anchor': 'start', style: 'font-size: 10pt' }},
            { html: line [2], attrs: {x: '7.2pt', y: '47.0pt', 'text-anchor': 'start', style: 'font-size: 10pt' }},
            { html: line [3], attrs: {x: '7.2pt', y: '61.0pt', 'text-anchor': 'start', style: 'font-size: 10pt' }},
          ];
        },
        address: function (shooter) {
          if (shooter.sh_addr2.length)
            return [
              { html: shooter.sh_fnln,  attrs: {x: '7.2pt', y: '19.0pt', 'text-anchor': 'start', style: 'font-weight: normal' }},
              { html: shooter.sh_addr1, attrs: {x: '7.2pt', y: '33.0pt', 'text-anchor': 'start', style: 'font-weight: normal' }},
              { html: shooter.sh_addr2, attrs: {x: '7.2pt', y: '47.0pt', 'text-anchor': 'start', style: 'font-weight: normal' }},
              { html: shooter.sh_csz,   attrs: {x: '7.2pt', y: '61.0pt', 'text-anchor': 'start', style: 'font-weight: normal' }},
            ];
          else
            return [
              { html: shooter.sh_fnln,  attrs: {x: '7.2pt', y: '26.0pt', 'text-anchor': 'start', style: 'font-weight: normal' }},
              { html: shooter.sh_addr1, attrs: {x: '7.2pt', y: '40.0pt', 'text-anchor': 'start', style: 'font-weight: normal' }},
              { html: shooter.sh_csz,   attrs: {x: '7.2pt', y: '54.0pt', 'text-anchor': 'start', style: 'font-weight: normal' }},
            ];
        },
        packet: function (shooter) {
          return [
            { html: shooter.sh_lnfn,           attrs: {x:  '95.0pt', y: '20.0pt', 'text-anchor': 'middle', style: 'font-size: larger'  }},
            { html: shooter.sh_dvp,            attrs: {x:  '95.0pt', y: '42.0pt', 'text-anchor': 'middle', style: 'font-size: larger'  }},
            { html: 'Comp #' + shooter.sh_pos, attrs: {x:   '7.2pt', y: '65.0pt', 'text-anchor': 'start',  style: 'font-size: normal'  }},
            { html: 'Squad ' + shooter.sh_sqd, attrs: {x: '182.0pt', y: '65.0pt', 'text-anchor': 'end',    style: 'font-size: normal'  }},
          ];
        },
      },
    }
  };

  //
  //
  //
  App.renderLabels = function (pv) {
    var printList = App.matchData.m.match_shooters;

    if (pv.sortKey)
      printList = _.sortByAll (printList, pv.sortKey, true);
    if (pv.selectionList === 'queued')
      printList = _.filter (printList, {sh_print: true});

    pmelib.labelEngine (pv, printList,
      function (shooter, addLabelCallback) {
        if (pv.numberOfStageLabels) {
          if (pv.collateStages) {
            _.times (pv.numberOfStageLabels, function () {
              _.each (App.matchData.m.match_stages, function (stage, stageNumber) {
                if (pv.selectedStages [stageNumber])
                  addLabelCallback (pv.labelSpec.format.competitor (shooter, stage.stage_name, stageNumber + 1));
              });
            });
          } else {
            _.each (App.matchData.m.match_stages, function (stage, stageNumber) {
              if (pv.selectedStages [stageNumber]) {
                _.times (pv.numberOfStageLabels, function () {
                  addLabelCallback (pv.labelSpec.format.competitor (shooter, stage.stage_name, stageNumber + 1));
                });
              }
            });
          }
        }

        _.times (pv.numberOfSpareLabels, function () {
          addLabelCallback (pv.labelSpec.format.competitor (shooter, 'Spare Label', '__'));
        });

        _.times (pv.numberOfVerificationLabels, function () {
          addLabelCallback (pv.labelSpec.format.verification (shooter));
        });

        _.times (pv.numberOfAddressLabels, function () {
          addLabelCallback (pv.labelSpec.format.address (shooter));
        });

        _.times (pv.numberOfPacketLabels, function () {
          addLabelCallback (pv.labelSpec.format.packet (shooter));
        });
      },
      function (shooter, addLabelCallback) {
        return addLabelCallback (pv.useBlanksAsSpares ? pv.labelSpec.format.competitor (shooter, 'Spare Label', '__') : null);
      }
    );
  };

  //
  //
  //
  App.saveLabelsSettings = function () {
    var settings = {};

    $('[config-save]').each (function () {
      var id = $(this).attr ('id');
      var controltype = $(this).attr ('controltype');

      if (controltype === 'checkbox')
        settings [id] = $(this).jqxCheckBox ('checked');
      else if (controltype === 'radiobutton')
        settings [id] = $(this).jqxRadioButton ('checked');
      else if ((controltype === 'numberinput') || (controltype === 'joginput'))
        settings [id] = $(this).jqxNumberInput ('val');
      else
        alert ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or joginput!', id);
    });

    App.socket.emit ('settings:labels:save', {
      uuid: App.matchData.m.match_id,
      settings: settings,
    }, function (data) {
      if (data.err)
        alert ('Error saving labels settings: ' + data.err);
    });

    return settings;
  };

  App.loadLabelsSettings = function (savedVars) {
    _.each (savedVars, function (value, id) {
      var controltype = id.match (/^(\w+)-?/) [1];

      if (controltype === 'checkbox')
        $('#' + id).each (function () {$(this).jqxCheckBox ({checked: value});});
      else if (controltype === 'radiobutton')
        $('#' + id).each (function () {$(this).jqxRadioButton ({checked: value});});
      else if ((controltype === 'numberinput') || (controltype === 'joginput'))
        $('#' + id).each (function () {$(this).jqxNumberInput ({value: value});});
      else
        alert ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or joginput!', id);
    });
  };

  App.updatePrintVariables = function () {
    var pv = {};
    var printStage        = $('#checkbox-labels-enabled-stage').jqxCheckBox ('checked');
    var printSpare        = $('#checkbox-labels-enabled-spare').jqxCheckBox ('checked');
    var printVerification = $('#checkbox-labels-enabled-verification').jqxCheckBox ('checked');
    var printAddress      = $('#checkbox-labels-enabled-address').jqxCheckBox ('checked');
    var printPacket       = $('#checkbox-labels-enabled-packet').jqxCheckBox ('checked');
    var allStages         = $('#radiobutton-labels-stage-labels-select').jqxCheckBox ('checked');

    pv.numberOfStageLabels        = printStage        ? $('#numberinput-labels-copies-stage').jqxNumberInput ('val')        : 0;
    pv.numberOfSpareLabels        = printSpare        ? $('#numberinput-labels-copies-spare').jqxNumberInput ('val')        : 0;
    pv.numberOfVerificationLabels = printVerification ? $('#numberinput-labels-copies-verification').jqxNumberInput ('val') : 0;
    pv.numberOfAddressLabels      = printAddress      ? $('#numberinput-labels-copies-address').jqxNumberInput ('val')      : 0;
    pv.numberOfPacketLabels       = printPacket       ? $('#numberinput-labels-copies-packet').jqxNumberInput ('val')       : 0;

    pv.selectedStages = [];

    $("[id^='checkbox-stage-select-number']").each (function () {
      var id = $(this).attr ('id').match (/(?:.*?)(\d+)$/);
      pv.selectedStages [(id && id [1]) ? id [1] : 0] = allStages || $(this).jqxCheckBox ('checked');
    });

    pv.collateStages = $('#checkbox-labels-collate-stage').jqxCheckBox ('checked');

    pv.orderDownThenAcross = $('#radiobutton-labels-order-down-across').jqxRadioButton ('checked');

    pv.useBlanksAsSpares = $('#checkbox-labels-leftovers-as-spares').jqxCheckBox ('checked');

    pv.nextCompetitorsStartsOn = $('#radiobutton-labels-next-column').jqxRadioButton ('checked') ? 'column' :
                                 $('#radiobutton-labels-next-label').jqxRadioButton ('checked') ?  'label' :
                                 'sheet';

    pv.selectionList = $('#radiobutton-labels-print-all').jqxRadioButton ('checked') ? 'all' :
                       $('#radiobutton-labels-print-queued').jqxRadioButton ('checked') ? 'queued' :
                       'all';

    pv.sortKey = $('#radiobutton-labels-sort-name').jqxRadioButton ('checked') ? ['sh_ln', 'sh_fn'] :
                 $('#radiobutton-labels-sort-cnum').jqxRadioButton ('checked') ? ['sh_pos'] :
                 $('#radiobutton-labels-sort-squadname').jqxRadioButton ('checked') ? ['sh_sqd', 'sh_ln', 'sh_fn'] :
                 $('#radiobutton-labels-sort-squadcnum').jqxRadioButton ('checked') ? ['sh_sqd', 'sh_pos'] :
                 $('#radiobutton-labels-sort-none').jqxRadioButton ('checked') ? null :
                 ['sh_ln', 'sh_fn'];

    pv.showLabelOutline = $('#checkbox-labels-outline').jqxCheckBox ('checked');
    pv.vjog = $('#joginput-labels-vjog').jqxNumberInput ('val');
    pv.hjog = $('#joginput-labels-hjog').jqxNumberInput ('val');

    //
    //  FIXME: This should be configurable at some point
    //
    pv.labelType = '5160';
    pv.labelSpec = labelSpec [pv.labelType];

    App.saveLabelsSettings ();

    return pv;
  };

  App.updateButtonStates = function () {
    var stageLabelsEnabled = $('#checkbox-labels-enabled-stage').jqxCheckBox ('checked');
    var allStagesChecked = $('#radiobutton-labels-stage-labels-all').jqxRadioButton ('checked');
    var spareLabelsEnabled = $('#checkbox-labels-enabled-spare').jqxCheckBox ('checked');
    var verificationLabelsEnabled = $('#checkbox-labels-enabled-verification').jqxCheckBox ('checked');
    var addressLabelsEnabled = $('#checkbox-labels-enabled-address').jqxCheckBox ('checked');
    var packetLabelsEnabled = $('#checkbox-labels-enabled-packet').jqxCheckBox ('checked');
    var printEnabled = false;

    if (!App.matchData.m.match_shooters || !App.matchData.m.match_shooters.length) {
      $('[no-competitors-hide]').hide ();
      $('[no-competitors-show]').show ();
    }

    if (!App.matchData.m.match_stages || !App.matchData.m.match_stages.length) {
      $('[no-stages-hide]').hide ();
      $('[no-stages-show]').show ();
    }

    $('[no-stage-labels-hide]').toggle (stageLabelsEnabled);
    $('[all-stages-selected-hide]').toggle (stageLabelsEnabled && !allStagesChecked);
    $('[no-spare-labels-hide]').toggle (spareLabelsEnabled);
    $('[no-verification-labels-hide]').toggle (verificationLabelsEnabled);
    $('[no-address-labels-hide]').toggle (addressLabelsEnabled);
    $('[no-packet-labels-hide]').toggle (packetLabelsEnabled);

    $("[id^='checkbox-labels-enabled']").each (function () {
      printEnabled |= $(this).jqxCheckBox ('checked');
    });

    $('[no-labels-disable-rb]').jqxRadioButton ('disabled', !printEnabled);
    $('[no-labels-disable-cb]').jqxCheckBox ('disabled', !printEnabled);
    $('[no-labels-disable-jog]').jqxNumberInput ('disabled', !printEnabled);
    $('[no-labels-fade]').css ({opacity: !printEnabled ? 0.55 : 1.00});

    if (stageLabelsEnabled) {
      var collateDisabled = $('#numberinput-labels-copies-stage').jqxNumberInput ('val') === 1;
      $('[one-stage-label-disable]').jqxCheckBox ('disabled', collateDisabled);
      $('[one-stage-label-fade]').css ({opacity: collateDisabled ? 0.55 : 1.00});
    }

    if (printEnabled) {
      var useNextLabel = $('#radiobutton-labels-next-label').jqxRadioButton ('checked');
      $('[use-next-label-disable]').jqxCheckBox ('disabled', useNextLabel);
      $('[use-next-label-fade]').css ({opacity: useNextLabel ? 0.55 : 1.00});
    }

    if (printEnabled) {
      var printAllLabels = $('#radiobutton-labels-print-all').jqxRadioButton ('checked');
      var queuedCount = _.filter (App.matchData.m.match_shooters, {sh_print: true}).length;

      $('#queued-label-count').text (queuedCount);
      $('[no-queued-labels-disable-rb]').jqxRadioButton ('disabled', !queuedCount);
      $('[no-queued-labels-disable-cb]').jqxCheckBox ('disabled', !queuedCount);
      $('[no-queued-labels-fade]').css ({opacity: !queuedCount ? 0.55 : 1.00});

      if (!queuedCount)
        $('[no-queued-labels-selected]').jqxRadioButton ('checked', true);

      $('[print-all-labels-disable]').jqxCheckBox ('disabled', printAllLabels || !queuedCount);
      $('[print-all-labels-fade]').css ({opacity: (printAllLabels || !queuedCount) ? 0.55 : 1.00});
    }

    $('#radiobutton-labels-next-column-text-top-beginning').html ($('#radiobutton-labels-order-down-across').jqxRadioButton ('checked') ? 'top' : 'beginning');
    $('#radiobutton-labels-next-column-text-column-row').html ($('#radiobutton-labels-order-down-across').jqxRadioButton ('checked') ? 'column' : 'row');

    $('#button-print-preview').jqxButton ('disabled', !printEnabled);
  };

  //
  //  Initialize controls
  //
  $('[controltype=radiobutton]').each (function () {
    $(this).jqxRadioButton ({
      groupName: $(this).attr ('radiobutton-group'),
      checked: !_.isUndefined ($(this).attr ('radiobutton-is-selected')) ? true : false,
    });
  });

  $('[controltype=checkbox]').jqxCheckBox ();
  $('[checkbox-is-selected]').jqxCheckBox ({checked: true});

  $('[controltype=numberinput]').jqxNumberInput ({
    value: 1,
    width: 40,
    decimalDigits: 0,
    min: 1,
    max: 30,
    inputMode: 'simple',
    spinButtons: true
  });

  $('[controltype=joginput]').jqxNumberInput ({
    value: 0,
    width: 50,
    decimalDigits: 0,
    min: -72,
    max: 72,
    inputMode: 'simple',
    spinButtons: true
  });

  $('#button-print-preview').jqxButton ({width: 105});

  $('[controltype=checkbox], [controltype=radiobutton]').each (function () {
    $(this).on ('click', function () {
      App.updateButtonStates ();
    });
  });

  $('[controltype=numberinput], [controltype=joginput]').each (function () {
    $('#' + $(this).attr ('id')).on ('valueChanged', function () {
      App.updateButtonStates ();
    });
  });

  $('#button-print-preview').click (function (e) {
    if (!App.matchDataChanged) {
      var pv = App.updatePrintVariables ();
      App.renderLabels (pv);
      e.preventDefault ();
      if (false)
        $('#labels').removeClass ('no-screen').show ();
      else
        window.print ();
    } else {
      // FIXME: add pop-up window indicating match data has changed, continue?
      // Maybe re-get matchdef section and compare? Or have server broadcast a
      // specific message for matchdef section changed?
    }
  });

  //
  //
  //
  App.getMatch = function () {
    App.socket.emit ('match:get', {options: {match: true, stages: true, lookups: true}}, function (data) {
      App.matchData = data.matchData;

      //
      //  Convert stuff we use to pretty format, so we don't have to
      //  do it elsewhere.
      //
      _.each (App.matchData.m.match_shooters, function (shooter) {
        if (_.indexOf (shooter.sh_ctgs, 'Lady') > -1)
          shooter.sh_gen = 'FEMALE';
        if (_.indexOf (shooter.sh_ctgs, 'Military') > -1)
          shooter.sh_mil = true;
        if (_.indexOf (shooter.sh_ctgs, 'Law Enforcement') > -1)
          shooter.sh_law = true;
        if (_.indexOf (shooter.sh_ctgs, 'Foreign') > -1)
          shooter.sh_frn = true;

        if (_.indexOf (shooter.sh_ctgs, 'Junior') > -1)
          shooter.sh_age = 'JUNIOR';
        else if (_.indexOf (shooter.sh_ctgs, 'Senior') > -1)
          shooter.sh_age = 'SENIOR';

        shooter.sh_age  = App.matchData.l.ages [shooter.sh_age]        || 'Adult';
        shooter.sh_gen  = App.matchData.l.genders [shooter.sh_gen]     || 'Male';
        shooter.sh_grd  = App.matchData.l.classes [shooter.sh_grd]     || 'X';
        shooter.sh_dvp  = App.matchData.l.divisions [shooter.sh_dvp]   || 'Unlimited';

        shooter.sh_fnln = shooter.sh_fn + ' ' + shooter.sh_ln;
        shooter.sh_lnfn = shooter.sh_ln + ', ' + shooter.sh_fn;
        shooter.sh_csz  = shooter.sh_city + (shooter.sh_city.length ? ', ' : '') + shooter.sh_st + (shooter.sh_st.length ? '  ' : '') + shooter.sh_zipcode;
      });

      _.remove (App.matchData.m.match_shooters, 'sh_del', true);
      _.remove (App.matchData.m.match_stages, 'stage_deleted', true);

      App.socket.emit ('settings:labels:load', {uuid: App.matchData.m.match_id}, function (data) {
        if (data.err)
          alert ('Error loading labels settings: ' + data.err);
        else if (data.settings)
          App.loadLabelsSettings (data.settings);

        App.updateButtonStates ();
      });
    });
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.getMatch ();
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.matchUpdated = function () {
    App.matchDataChanged = true;
  };

  App.reload = function () {
    alert ('New match loaded, reloading labels page!');
    window.location.href = 'http://' + window.location.host + '/reports/labels';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Reports->Labels'});

  window.onerror = function (msg, url, line, col, error) {
    if (App.socket) {
      App.socket.emit ('errorlog:error', {
        msg: msg,
        url: url,
        line: line,
        col: col,
        stack: error.stack,
      });
    } else {
      alert ('An internal error has occurred. Please check the javascript console for errors');
    }

    return false;
  };
});
