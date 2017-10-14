'use strict';

var urlNJS = require ('url');

function errorNotImplemented (res, err, app, html) {
  if (err) {
    res.render ('error/notimplemented', app.jadeGetVars ({title: 'PMM - Error!'}));
    console.dir (err);
  } else
    res.end (html);
}

function normalizeURL (url, matchType) {
  url = urlNJS.parse (url);
  url.pathname = url.pathname.replace (/\/+$/, '') + '/' + matchType;
  return urlNJS.format (url);
}

function addKiosk (url) {
  url = urlNJS.parse (url);

  if (!url.search)
    url.search = 'kiosk=1';
  else if (!url.search.match (/kiosk=\d+/))
    url.search = url.search.concat ('kiosk=1');

  return urlNJS.format (url);
}

function commonCode (req, res, app, title) {
  var pathname = urlNJS.parse (req.url).pathname.replace (/\/+$/, '');

  res.render (pathname.substr (1), app.jadeGetVars ({title: title, pathname: pathname}), function (err, html) {
    errorNotImplemented (res, err, app, html);
  });
}

module.exports = function (app) {
  app.param ('matchtype', function (req, res, next) {
    req.params.matchtype = app.pmm.match ().matchdef ().getMatchTypePMM ();
    next ();
  });

  app.get ('/kiosk', function (req, res) {
    commonCode (req, res, app, 'PMM - Kiosk Functions');
  });

  app.get ('/kiosk/progress', function (req, res) {
    req.url = addKiosk (req.url);
    commonCode (req, res, app, 'PMM - Progress (Kiosk)');
  });

  app.get ('/kiosk/scores', function (req, res) {
    req.url = addKiosk (req.url);
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/kiosk/scores/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Scores (Kiosk)');
  });

  app.get ('/kiosk/scores2', function (req, res) {
    req.url = addKiosk (req.url);
    res.redirect (normalizeURL (req.url, app.pmm.match ().matchdef ().getMatchTypePMM ()));
  });

  app.get ('/kiosk/scores2/:matchtype', function (req, res) {
    commonCode (req, res, app, 'PMM - Scores (Kiosk)');
  });

  app.get ('/kiosk/vendor', function (req, res) {
    commonCode (req, res, app, 'PMM - Vendors (Kiosk)');
  });
};
