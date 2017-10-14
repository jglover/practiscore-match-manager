//
//  Common library for browser-side JavaScript
//
var pmelib = (function (my) {
  'use strict';

  my.getWidthOfText = function (txt) {
    var w;
    var secretSpan = $('#secret-span');
    $(secretSpan).html (txt).show ();
    w = $(secretSpan).width ();
    $(secretSpan).text ('').hide ();
    return w;
  };

  return my;
}(pmelib || {}));
