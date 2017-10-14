'use strict';

var psutils = require ('../lib/utils');

module.exports = function (app) {
  app.get ('/', function (req, res) {
    res.render ('index', app.jadeGetVars ({title: 'PMM - Main Menu', pathname: psutils.pathStrip (req.path) + '/index'}));
  });
};
