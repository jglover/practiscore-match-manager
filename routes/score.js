'use strict';

var psutils = require ('../lib/utils');

module.exports = function (app) {
  app.get ('/score', function (req, res) {
    res.render (req.url.substr (1), {
      'path' : psutils.pathStrip (req.path) + '/index',
      'matchData': app.pmm.getCompleteMatch (),
    });
  });
};
