'use strict';

// var favicon = require ('serve-favicon');
var async = require ('async');
var bodyParser = require ('body-parser');
var cookieParser = require ('cookie-parser');
var express = require ('express.io');
var fs = require ('fs');
var lodash = require ('lodash');
// var logger = require ('morgan');
var os = require ('os');
var path = require ('path');
var pmm = require ('./lib/PMM');
var pmelog = require ('./lib/pmelog');
var readline = require ('readline');
var nc = require ('namecase');

//
//  We usually want more than 10 layers of backtrace
//
Error.stackTraceLimit = Infinity;

//
//  Do this here, so it's extended in one place. Used by shooter.js and ssi.js
//
String.prototype.toNameCase = function () {
  var name = nc (nc.normalize (this.toString ()), {individualFields: true});

  if (name === 'le')
    name = 'Le';

  return name;
};

//
//
//
var app = express ({log: true}).http ().io ();

app.locals._ = lodash;

//
//  Create the debug directory if it doesn't exist
//
try {
  fs.mkdirSync ('debug');
} catch (e) {
  if (e.code !== 'EEXIST')
    throw (e);
}

//
//  FIXME: appendFile (async) causes us to run out of file handles if there's a
//  flood of log messages. Ideally we should buffer these and flush them when
//  we get a certain number, or if a timer expires. For now, we'll just beat
//  the hell out of the disk.
//
var logBuffer = '';

pmelog.on ('logclose', function () {
  if (logBuffer.length)
    fs.appendFileSync ('logfile.txt', logBuffer);
});

pmelog.on ('log', function (text) {
  logBuffer = logBuffer.concat (text);

  if (logBuffer.length >= (16 * 1024)) {
    fs.appendFileSync ('logfile.txt', logBuffer);
    logBuffer = '';
  }
/*
  fs.appendFile ('logfile.txt', text + '\n', function (err) {
    if (err)
      throw (err);
  });
*/
});

/*
//
//  Not sure how to correctly handle this. We can't require lib/file.js above
//  because it needs to be created as an object, which is done in lib/PMM.js.
//  To work around this, the event handler is initialized in lib/PMM.js where
//  the file onject is created. That's inconsistent with everything else.
//  Ideas welcome.
//
pmelog.on ('rawlog', function (logLevel, logText) {
  psfile.logfileSave (logLevel, logText);
});
*/

pmelog.on ('dir', function (text) {
  logBuffer = logBuffer.concat (text);

  if (logBuffer.length >= (16 * 1024)) {
    fs.appendFileSync ('logfile.txt', logBuffer);
    logBuffer = '';
  }
});

app.pmelog = pmelog;

//
//  This allows loading of .js files from the routes directory and any
//  sub-directories.
//
function recursiveRoutes (folderName) {
  fs.readdirSync (folderName).forEach (function (file) {
    var fullName = path.join (folderName, file);
    var stat = fs.lstatSync (fullName);

    if (stat.isDirectory ()) {
      recursiveRoutes (fullName);
    } else if (file.match (/\.js$/g)) {
      require ('./' + fullName) (app);
    }
  });
}

recursiveRoutes ('./routes/');

// app.get ('*', function (request, response) {
//   response.end ('404!');
// });

//
//  Because Windoze has the stupids...
//
if (process.platform === 'win32') {
  var rl = readline.createInterface ({
    input: process.stdin,
    output: process.stdout
  });

  rl.on ('SIGINT', function () {
    process.emit ('SIGINT');
  });
}

process.on ('SIGINT', function () {
  var usage = process.memoryUsage ();

  pmelog.llog (pmelog.NORMAL, 'RSS = %dK', Math.round (usage.rss / 1024));
  pmelog.llog (pmelog.NORMAL, 'heapTotal = %dK', Math.round (usage.heapTotal / 1024));
  pmelog.llog (pmelog.NORMAL, 'heapUsed = %dK', Math.round (usage.heapUsed / 1024));
  pmelog.close ();

  process.exit ();
});

//
//  View engine setup
//
// app.set ('views', path.join (__dirname, 'views'));
// app.set ('view engine', 'jade');
// app.locals.basedir = app.get ('views');
app.set ('views', path.join (__dirname, 'views_pug'));
app.set ('view engine', 'pug');
app.locals.basedir = app.get ('views');
app.locals.pretty = false;
app.locals.debug = false;

// app.use (favicon ());
// app.use (logger ('dev'));
app.use (express.compress ());
app.use (bodyParser.json ());
app.use (bodyParser.urlencoded ({extended: true}));
app.use (cookieParser ());
app.use (express.static (path.join (__dirname, 'public')));

//
//  Catch 404 and forward to error handler
//
app.use (function (req, res, next) {
  var err = new Error ('Not Found');
  err.status = 404;
  next (err);
});

//
//  Development error handler -  will print stacktrace
//
if (app.get ('env') === 'development') {
  app.use (function (err, req, res, next) {
    next = next;
    res.render ('error', {
      message: err.message,
      error: err
    });
  });
}

//
//  Production error handler - no stacktraces leaked to user
//
app.use (function (err, req, res, next) {
  next = next;
  res.render ('error', {
    message: err.message,
    error: {}
  });
});

//
//  Display available interfaces. At some point, we need to use this info
//  and configure ourselves to use the IP + netmask as the default range
//  for probing for stage devices.
//
var showInterfaces = function () {
  var ifaces = os.networkInterfaces ();

  var parse = function (dev) {
    var alias = 0;

    ifaces [dev].forEach (function (details) {
      if (/*(details.family === 'IPv4') &&*/ (details.internal === false)) {
        pmelog.llog (pmelog.NORMAL, dev + (alias ? ':' + alias : ''), details.address);
        ++alias;
      }
    });
  };

  for (var dev in ifaces)
    parse (dev);
};

//
//
//
app.jadeGetVars = function (options) {
  options = options || {};
  options.title = options.title || '(not set)';
  options.pathname = options.pathname || '(not set)';

  return {
    'title': options.title,
    'path' : options.pathname,

    'theme': app.pmm.config ().get ('pmmui', 'theme'),
    'menuautoopen': app.pmm.config ().get ('pmmui', 'menuautoopen'),
    'inlineediting': app.pmm.config ().get ('pmmui', 'inlineediting'),
    'usecategorylist': app.pmm.config ().get ('pmmui', 'usecategorylist'),

    'matchname': app.pmm.match ().matchdef ().getName (),
    'matchname_stripped': app.pmm.match ().matchdef ().getNameStripped (),
    'pmmmatchtype': app.pmm.match ().matchdef ().getMatchTypePMM (),
    'pmmmatchtypejs': app.pmm.match ().matchdef ().getMatchTypePMM () + '.js',

    'match': app.pmm.getCompleteMatch (),
    'config': app.pmm.config (),

    'platform': process.platform,
  };
};

//
//  Tell everyone about ourselves
//
showInterfaces ();
pmelog.llog (pmelog.NORMAL, 'Hostname is \'%s\'', os.hostname ());
pmelog.llog (pmelog.NORMAL, 'Operating system is \'%s\'', os.type ());
pmelog.llog (pmelog.NORMAL, 'Release is \'%s\'', os.release ());
pmelog.llog (pmelog.NORMAL, 'Platform is \'%s\'', os.platform ());
pmelog.llog (pmelog.NORMAL, 'Architecture is \'%s\'', os.arch ());
pmelog.llog (pmelog.NORMAL, 'Available CPU cores is \'%s\'', os.cpus ().length);

//
//
//
async.series (
  [
    //
    //  Create all the objects, using the hard-coded defaults
    //
    function (callback) {
      new pmm.PMM (app.io, function (err, pmmObject) {
        app.pmm = pmmObject;
        callback (err);
      });
    },
    //
    //  Load the configuration from the database, if present. Then update the
    //  objects with their new configuration (which may actually be the same,
    //  but that won't hurt anything).
    //
    function (callback) {
      app.pmm.config ().load (function (err, savedConfig) {
        if (!err)
          app.pmm.updateConfig (savedConfig);
        callback (err);
      });
    },
    //
    //  Start the server
    //
    function (callback) {
      app.pmm.server ().start (function (err) {
        callback (err);
      });
    },
    //
    //  Start the PractiPrint service
    //
    function (callback) {
      app.pmm.print ().start (function (err) {
        callback (err);
      });
    },
    //
    //  Start the Devices
    //
    function (callback) {
      app.pmm.devices ().start (function (err) {
        callback (err);
      });
    },
    //
    function (callback) {
      pmelog.llog (pmelog.NORMAL, 'Match ID is %s', app.pmm.match ().matchdef ().getID ());
      pmelog.llog (pmelog.NORMAL, 'IP scan range is %s', app.pmm.config ().get ('devices', 'ipblock'));
      callback (null);
    },
  ], function (err) {
    if (err)
      throw (err);
  }
);

//
//
//
module.exports = app;
