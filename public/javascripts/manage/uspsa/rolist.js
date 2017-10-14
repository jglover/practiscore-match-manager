/* global io */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};
  var grid = $('#viewGrid');
  var jqwindow = $('#viewWindow');

  var rolistSource = {
    datatype: 'array',
    localdata: [],
    datafields: [
      { name: 'rowid',                    type: 'number' },
      { name: 'uspsa_num',                type: 'string' },
      { name: 'name',                     type: 'string' },
      { name: 'state',                    type: 'string' },
      { name: 'certification',            type: 'string' },
      { name: 'certification_expiration', type: 'string' },
      { name: 'uspsa_num_expiration',     type: 'string' },
    ],
  };

  var rolistAdapter = new $.jqx.dataAdapter (rolistSource);

  $('[controltype=button]').each (function () {
    $(this).jqxButton ({
      disabled: true,
      width: $(this).attr ('button-width'),
    });
  });

  $('#ec-uspsanum').jqxInput ({width: 75, height: 25, maxLength: 9});
  $('#ec-uspsapw').jqxInput ({width: 250, height: 25, maxLength: 20});

  $("[id^='ec-']").on ('focus', function () {
    $(this).addClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-']").on ('focusout', function () {
    $(this).removeClass ('jqx-menu-item-top-hover-' + pmmui.theme);
  });

  $("[id^='ec-uspsa']").on ('blur, keyup', function () {
    var hasLength = true;

    $("[id^='ec-uspsa']").each (function () {
      hasLength = hasLength & ($(this).jqxInput ('val').length ? true : false);
    });

    $('#button-get').jqxButton ({disabled: !hasLength});
  });

  $('#button-get').click (function () {
    $('[update-tr], [view-tr]').hide ();
    $('[controltype=button]').jqxButton ({disabled: true});

    App.socket.on ('status', function (data) {
      $('#getMsg').text (data.status);
      $('[getmsg-tr]').show ();
    });

    App.socket.emit ('rolist:update:uspsa', {
        uspsanum: $('#ec-uspsanum').jqxInput ('val'),
        uspsapw: $('#ec-uspsapw').jqxInput ('val'),
      }, function (data) {
        if (data.err)
          $('#getMsg').html (data.msg);
        else
          $('#getMsg').html (data.records + ' ROs and CROs retrieved from USPSA.org');

        App.socket.removeAllListeners ('status');
        App.refreshMatchData ();
        $('[controltype=button]').jqxButton ({disabled: false});
    });
  });

  $(jqwindow).jqxWindow ({
    width: 655,
    height: 597,
    maxHeight: 597,
    position: 'center',
    resizable: false,
    isModal: false,
    autoOpen: false,
    showCloseButton: true,
  });

  $(jqwindow).on ('open', function () {
    $(grid).jqxGrid ({
      width: 645,
      height: 558,
      sortable: true,
      showsortmenuitems: false,
      showsortcolumnbackground: false,
      filterable: true,
      autoshowfiltericon: true,
      showfilterrow: true,
      showfiltercolumnbackground: false,
      columnsreorder: false,
      columnsresize: false,
      pageable: false,
      scrollmode: 'logical',
      altrows: true,
      editable: false,
      editmode: 'none',
      selectionmode: 'none',
      showstatusbar: false,
      columnsheight: 26, // Changed from 26 to 31 in 4.1.2
      pagerheight: 29,   // Changed from 29 to 35 in 4.1.2
      rowsheight: 25,    // Changed from 25 to 28 in 4.1.2
      columns: [
        { text: '#',             datafield: 'rowid',                     width:  40 },
        { text: 'USPSA #',       datafield: 'uspsa_num',                 width:  68 },
        { text: 'Name',          datafield: 'name',                      width: 200 },
        { text: 'Expires',       datafield: 'uspsa_num_expiration',      width:  86 },
        { text: 'State',         datafield: 'state',                     width:  55 },
        { text: 'Certification', datafield: 'certification',             width:  90 },
        { text: 'Expires',       datafield: 'certification_expiration',  width:  86 },
      ],
    });

    $(grid).on ('cellclick', function (event) {
      if (event.args && !event.args.rightclick && (event.args.datafield === 'uspsa_num'))
        window.open ('http://www.uspsa.org/uspsa-classifer-lookup-results.php?number=' + event.args.value, 'USPSA Lookup');
    });

    App.socket.emit ('rolist:get:uspsa:records', function (data) {
      rolistSource.localdata = data.records;
      $(grid).jqxGrid ({source: rolistAdapter});
    });
  });

  $('#button-view').click (function () {
    $(jqwindow).jqxWindow ('show');
  });

  //
  //
  //
  App.refreshMatchData = function () {
    App.socket.emit ('match:name', function (data) {
      $('#matchname').text (data.matchname);

      App.socket.emit ('rolist:get:uspsa:count', function (data) {
        $('#button-view').jqxButton ({disabled: !data.totalrecords});
        $('[view-tr]').toggle (data.totalrecords ? true : false);
      });
    });
  };

  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.refreshMatchData ();
  };

  App.socketDisconnect = function () {
    $('[message]').text ('');
    $(jqwindow).jqxWindow ('close');
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.reload = function () {
    window.location.href = 'http://' + window.location.host + '/manage/uspsa/rolist';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.refreshMatchData);
  App.socket.on ('reload', App.reload);
  App.socket.emit ('log:log', {msg: 'Manage->USPSA.org->Update RO/CRO List'});
});
