/* global io, moment */
/* global _:false */

$(function () {
  'use strict';

  var App = {};
  var v = {};

  v.rssMax = 0;
  v.rssCur = 0;
  v.rssMin = 0;
  v.heapTotalMax = 0;
  v.heapTotalCur = 0;
  v.heapTotalMin = 0;
  v.heapUsedMax = 0;
  v.heapUsedCur = 0;
  v.heapUsedMin = 0;
  v.heapFreeMax = 0;
  v.heapFreeCur = 0;
  v.heapFreeMin = 0;

  App.socket = io.connect ();

  App.getUsage = function () {
    App.socket.emit ('utils:memory', function (data) {
      $('#lastUpdate').text (moment ().format ('YYYY-MM-DD HH:mm:ss'));

      v.rssCur = data.memory.rss;
      v.heapTotalCur = data.memory.heapTotal;
      v.heapUsedCur = data.memory.heapUsed;
      v.heapFreeCur = (data.memory.heapTotal - data.memory.heapUsed);

      v.rssMax = _.max ([v.rssCur, v.rssMax]);
      v.rssMin = _.min ([v.rssCur, v.rssMin || v.rssCur]);

      v.heapTotalMax = _.max ([v.heapTotalCur, v.heapTotalMax]);
      v.heapTotalMin = _.min ([v.heapTotalCur, v.heapTotalMin || v.heapTotalCur]);

      v.heapUsedMax = _.max ([v.heapUsedCur, v.heapUsedMax]);
      v.heapUsedMin = _.min ([v.heapUsedCur, v.heapUsedMin || v.heapUsedCur]);

      v.heapFreeMax = _.max ([v.heapFreeCur, v.heapFreeMax]);
      v.heapFreeMin = _.min ([v.heapFreeCur, v.heapFreeMin || v.heapFreeCur]);

      for (var vKey in v)
        $('#' + vKey).text ((v [vKey] / 1024).toFixed (0) + 'K');
    });
  };

  App.socket.on ('connect', function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.getUsage ();

    App.intervalTimer = setInterval (function () {
      App.getUsage ();
    }, 10000);
  });

  App.socket.on ('disconnect', function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();

    if (App.intervalTimer)
      clearInterval (App.intervalTimer);
  });

  App.socket.emit ('log:log', {'msg': 'Utilities->Memory Usage'});
});
