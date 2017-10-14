'use strict';

var _ = require ('lodash');
var chalk = require ('chalk');
var events = require ('events');
var util = require ('util');
var psutils = require ('./utils');

var levelMap = {
    0: 'RESERVED',
    1: 'CRITICAL',
    2: 'ERROR',
    3: 'WARN',
    4: 'NORMAL',
    5: 'INFO',
    6: 'VERBOSE',
    7: 'DEBUG',
  999: 'ALL',
 1000: 'NONE',
};

var colorize = {
    0: chalk.reset,       // Reserved (not valid to llog())
    1: chalk.bold.red,    // Critical
    2: chalk.red,         // Error
    3: chalk.bold.yellow, // Warn
    4: chalk.reset,       // Normal
    5: chalk.green,       // Info
    6: chalk.cyan,        // Verbose
    7: chalk.cyan,        // Debug
  999: chalk.reset,       // All (not valid to llog())
 1000: chalk.reset,       // None (not valid to llog())
};

//
//
//
function Pmelog (stdout, stderr) {
  if (!(this instanceof Pmelog)) {
    console.log ('Creating new pmelog instance');
    return new Pmelog (stdout, stderr);
  }

  if (!stdout || !_.isFunction (stdout.write))
    throw new TypeError ('Pmelog expects a writable stream instance');

  if (!stderr)
    stderr = stdout;

  var prop = {
    writeable: true,
    enumerable: false,
    configurable: false,
  };

  prop.value = {};
  Object.defineProperty (this, '_level', prop);

  for (var key in levelMap) {
    prop.value = key;
    Object.defineProperty (this, levelMap [key], prop);
  }

  prop.value = stdout;
  Object.defineProperty (this, '_stdout', prop);

  prop.value = stderr;
  Object.defineProperty (this, '_stderr', prop);

  prop.value = {};
  Object.defineProperty (this, '_times', prop);

  Object.keys (Pmelog.prototype).forEach (function (k) {
    this [k] = this [k].bind (this);
  }, this);

  events.EventEmitter.call (this);

  // console.log (chalk.bold.red    ('chalk test: red text on default background (critical)'));
  // console.log (chalk.bold.yellow ('chalk test: yellow text on default background (warn)'));
  // console.log (chalk.reset       ('chalk test: default text on default background (normal)'));
  // console.log (chalk.green       ('chalk test: green text on default background (info)'));
  // console.log (chalk.cyan        ('chalk test: cyan text on default background (verbose)'));

  this._level.l = this.DEBUG;
}

util.inherits (Pmelog, events.EventEmitter);

Pmelog.prototype.className = function () {
  return 'Pmelog';
};

//
//
//
Pmelog.prototype.getlevel = function () {
  return {'level': this.level.l, 'name': levelMap [this.level.l]};
};

Pmelog.prototype.setlevel = function (level) {
  var self = this;

  self._level.l = level || this.ALL;
};

//
//
//
Pmelog.prototype.log = function () {
  var self = this;

  arguments [0] = psutils.timeStampLocal () + ': ' + arguments [0];

  var text = util.format.apply (self, arguments) + '\n';

  self.emit ('log', chalk.stripColor (text));
  self._stdout.write (text);
};

Pmelog.prototype.info = Pmelog.prototype.log;

//
//
//
Pmelog.prototype.warn = function () {
  var self = this;

  arguments [0] = psutils.timeStampLocal () + ': ' + arguments [0];

  var text = util.format.apply (self, arguments) + '\n';

  self.emit ('warn', chalk.stripColor (text));
  self._stderr.write (text);
};

Pmelog.prototype.error = Pmelog.prototype.warn;

//
//
//
Pmelog.prototype.dir = function (object, options) {
  var self = this;
  var text = util.inspect (object, util._extend ({ customInspect: false }, options)) + '\n';

  self.emit ('dir', chalk.stripColor (text));
  self._stdout.write (text);
};

//
//
//
Pmelog.prototype.llog = function () {
  var self = this;

  if ((arguments.length < 2) || (arguments [0] === self.NONE))
    return;

  if ((arguments [0] || self.RESERVED) <= self._level.l) {
    var logLevel = arguments [0];
    var useColor = colorize [logLevel];
    var text = [];
    var logText;

    if (!useColor) {
      console.log ('Eh? useColor is null, arguments [0]=\'%s\'', arguments [0]);
      console.dir (arguments);
      useColor = chalk.reset;
    }

    logText = util.format.apply (self, Array.prototype.slice.call (arguments, 1));
    text [0] = useColor (logText);

    self.log.apply (self, text);
    self.emit ('rawlog', logLevel, logText);
  }
};

//
//  Use {depth: null, colors: true}
//
Pmelog.prototype.ldir = function (level, object, options) {
  var self = this;

  if (level === self.NONE)
    return;

  if (_.isObject (level)) {
    if (_.isPlainObject (object))
      options = object;
    object = level;
    level = self.DEBUG;
  }

  if ((level || self.RESERVED) <= self._level.l) {
    var text = util.inspect (object, util._extend ({ customInspect: false }, options)) + '\n';

    self.emit ('dir', text);
    self._stdout.write (text);
  }
};

Pmelog.prototype.ldirex = function (level, object, options) {
  this.ldir (level, object, _.merge ({depth: null, colors: true}, options));
};

//
//
//
Pmelog.prototype.time = function (label) {
  this._times [label] = Date.now ();
};

Pmelog.prototype.timeEnd = function (label) {
  var time = this._times [label];

  if (!time)
    throw new Error ('No such label: ' + label);

  var duration = Date.now () - time;
  this.log ('%s: %dms', label, duration);
};

//
//
//
Pmelog.prototype.close = function () {
  this.emit ('logclose');
  return this;
};

//
//
//
/*
Pmelog.prototype.trace = function () {
  var err = new Error ();
  err.name = 'Trace';
  err.message = util.format.apply (this, arguments);
  Error.captureStackTrace (err, arguments.callee);
  this.error (err.stack);
};
*/

//
//
//
Pmelog.prototype.assert = function (expression) {
  if (!expression) {
    var arr = Array.prototype.slice.call (arguments, 1);
    require ('assert').ok (false, util.format.apply (this, arr));
  }
};

module.exports = new Pmelog (process.stdout, process.stderr);
module.exports.Pmelog = Pmelog;
