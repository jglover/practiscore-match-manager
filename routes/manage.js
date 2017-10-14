'use strict';

var urlNJS = require ('url');

function errorNotImplemented (res, err, app, html) {
  if (err) {
    res.render ('error/notimplemented', app.jadeGetVars ({title: 'PMM - Error!'}));
    console.dir (err);
  } else
    res.end (html);
}

/*
function normalizeURL (url, matchType) {
  url = urlNJS.parse (url);
  url.pathname = url.pathname.replace (/\/+$/, '') + '/' + matchType;
  return urlNJS.format (url);
}
*/

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

  app.get ('/manage', function (req, res) {
    commonCode (req, res, app, 'PMM - Match Management');
  });

  app.get ('/manage/checkin', function (req, res) {
    commonCode (req, res, app, 'PMM - Competitor Check-in');
  });

  app.get ('/manage/devices', function (req, res) {
    commonCode (req, res, app, 'PMM - Devices');
  });

  app.get ('/manage/progress', function (req, res) {
    commonCode (req, res, app, 'PMM - Progress Monitor');
  });

  app.get ('/manage/sc/classifications', function (req, res) {
    commonCode (req, res, app, 'PMM - Update Classifications');
  });

  app.get ('/manage/uspsa/activity', function (req, res) {
    commonCode (req, res, app, 'PMM - USPSA.org Activity Report');
  });

  app.get ('/manage/uspsa/classifications', function (req, res) {
    commonCode (req, res, app, 'PMM - Update Classifications');
  });

  app.get ('/manage/uspsa/rolist', function (req, res) {
    commonCode (req, res, app, 'PMM - Update USPSA RO/CRO List');
  });

  app.get ('/manage/uspsa/scores', function (req, res) {
    commonCode (req, res, app, 'PMM - USPSA.org Scores');
  });

  app.get ('/manage/uspsa/states', function (req, res) {
    commonCode (req, res, app, 'PMM - Update USPSA States');
  });
};
