/* global io, PrettyJSON */

$(function () {
  'use strict';

  var App = {};

  $('button').button ();

  //
  //  We're received match data, so let's figure it out
  //
  App.socketConnect = function () {
    App.socket.emit ('match:get', {options: {all: true}}, function (data) {
      App.pj = new PrettyJSON.view.Node ({
        el: $('#prettyJSON'),
        data: data.matchData,
      });

      $('#buttonExpand')
        .off ()
        .click (function () {
          App.pj.expandAll ();
        }
      );

      $('#buttonCollapse')
        .off ()
        .click (function () {
          App.pj.collapseAll ();
        }
      );
    });
  };

  //
  //  Ye olde main...
  //
  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.emit ('log:log', {'msg': 'Utilities->JSON Explorer'});
});
