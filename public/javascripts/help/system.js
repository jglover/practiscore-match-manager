/* global io */
/* global _:false */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  App.socket = io.connect ();

  App.socket.on ('connect', function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.socket.emit ('utils:interfaces', function (data) {
      var table = document.createElement ('table');
      var thead = document.createElement ('thead');
      var tbody = document.createElement ('tbody');
      var tr    = document.createElement ('tr');
      var th;
      var td;

      _.each (['Interface', 'Address', 'Sync Code'], function (t) {
        th = document.createElement ('th');
        th.innerHTML = t;
        tr.appendChild (th);
      });

      thead.appendChild (tr);

      _.each (data.interfaces, function (iface) {
        var syncCode = '(n/a)';

        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test (iface.address)) {
          var ipAddress = iface.address.match (/(\d+)\.(\d+)$/);

          syncCode = (('0' + parseInt (ipAddress [1]).toString (16)).substr (-2) + ('0' + parseInt (ipAddress [2]).toString (16)).substr (-2)).toUpperCase ();
        }

        tr = document.createElement ('tr');
        td = document.createElement ('td');
        td.innerHTML = iface.name;
        tr.appendChild (td);

        td = document.createElement ('td');
        td.innerHTML = iface.address;
        tr.appendChild (td);

        td = document.createElement ('td');
        td.innerHTML = syncCode;
        tr.appendChild (td);

        tbody.appendChild (tr);
      });

      table.id = 'interfacesTable';
      table.appendChild (thead);
      table.appendChild (tbody);

      $('#interfaces').empty ().append (table);
    });
  });

  App.socket.on ('disconnect', function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  });

  App.socket.emit ('log:log', {'msg': 'Help->System info'});
});
