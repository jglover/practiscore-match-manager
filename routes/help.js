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
  app.get ('/help', function (req, res) {
    commonCode (req, res, app, 'PMM - Help');
  });

  app.get ('/help/about', function (req, res) {
    commonCode (req, res, app, 'PMM - About');
  });

  app.get ('/help/help', function (req, res) {
    commonCode (req, res, app, 'PMM - Help');
  });

  app.get ('/help/system', function (req, res) {
    commonCode (req, res, app, 'PMM - System');
  });
};
