'use strict';

var urlNJS = require ('url');

function errorNotImplemented (res, err, app, html) {
  if (err) {
    res.render ('error/notimplemented', app.jadeGetVars ({title: 'PMM - Error!'}));
    console.dir (err);
  } else
    res.end (html);
}

function commonCode (req, res, app, title) {
  var pathname = urlNJS.parse (req.url).pathname.replace (/\/+$/, '');

  res.render (pathname.substr (1), app.jadeGetVars ({title: title, pathname: pathname}), function (err, html) {
    errorNotImplemented (res, err, app, html);
  });
}

module.exports = function (app) {
  app.get ('/config', function (req, res) {
    commonCode (req, res, app, 'PMM - Configuration');
  });

  app.get ('/config/debug', function (req, res) {
    commonCode (req, res, app, 'PMM - Debug Configuration');
  });

  app.get ('/config/devices', function (req, res) {
    commonCode (req, res, app, 'PMM - Device Configuration');
  });

  app.get ('/config/download', function (req, res) {
    commonCode (req, res, app, 'PMM - Download Configuration');
  });

  app.get ('/config/file', function (req, res) {
    commonCode (req, res, app, 'PMM - File Configuration');
  });

  app.get ('/config/kiosk', function (req, res) {
    commonCode (req, res, app, 'PMM - Kiosk Configuration');
  });

  app.get ('/config/match', function (req, res) {
    commonCode (req, res, app, 'PMM - Match Configuration');
  });

  app.get ('/config/practiprint', function (req, res) {
    commonCode (req, res, app, 'PMM - PractiPrint Configuration');
  });

  app.get ('/config/progress', function (req, res) {
    commonCode (req, res, app, 'PMM - Progress Configuration');
  });

  app.get ('/config/server', function (req, res) {
    commonCode (req, res, app, 'PMM - Server Configuration');
  });

  app.get ('/config/startup', function (req, res) {
    commonCode (req, res, app, 'PMM - Startup Configuration');
  });

  app.get ('/config/ui', function (req, res) {
    commonCode (req, res, app, 'PMM - User Interface Configuration');
  });
};
