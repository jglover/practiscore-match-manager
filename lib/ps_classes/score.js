'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

//
//
//
function ConversionError () {
  var tmp = Error.apply (this, arguments);
  tmp.name = this.name = 'ConversionError';

  this.stack = tmp.stack;
  this.message = tmp.message;

  return this;
}

var IntermediateInheritor = function () {};
IntermediateInheritor.prototype = Error.prototype;
ConversionError.prototype = new IntermediateInheritor ();

//
//
//
var tsDecode = function (hits) {
  var a   = (hits >>  0) & 0x0f;
  var b   = (hits >>  4) & 0x0f;
  var c   = (hits >>  8) & 0x0f;
  var d   = (hits >> 12) & 0x0f;
  var ns  = (hits >> 16) & 0x0f;
  var m   = (hits >> 20) & 0x0f;
  var npm = (hits >> 24) & 0x0f;
  var s   = '';

  if (a) s = s.concat (a + 'A/');
  if (b) s = s.concat (b + 'B/');
  if (c) s = s.concat (c + 'C/');
  if (d) s = s.concat (d + 'D/');
  if (m) s = s.concat (m + 'M/');
  if (ns) s = s.concat (ns + 'NS/');
  if (npm) s = s.concat (npm + 'NPM/');

  if (s.length)
    s = s.substr (0, s.length - 1);
  else
    s = '(none)';

  return s;
};

var Score = function () {
  var self = this;

  self._pendingChanges = false;
  self._fieldParsed    = {};

  self.aprv  = false;                    // Approved
  self.dname = '';                       // Device name score was entered on
  self.dnf   = false;                    // Did Not Fire
  self.dqr   = '';                       // DQ Reason
  self.mod   = psutils.timeStampUTC ();  // Modified
  self.penr  = '';                       // Penalty Reason (FIXME: Move to match type)
  self.poph  = 0;                        // Popper Hits
  self.popm  = 0;                        // Popper Misses
  self.shtr  = '';                       // Shooter UID
  self.str   = [];                       // String times
  self.ts    = [];                       // Target Scores (FIXME: Move to match type)
  self.udid  = '';                       // Unique Device ID

  return self;
};

Score.prototype.className = function () {
  return 'Score';
};
Score.prototype.getApproved = function () {
  return this.aprv;
};
Score.prototype.isApproved = function () {
  return this.aprv;
};
Score.prototype.setApproved = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setApproved() argument must be boolean');
  this.aprv = state;
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.setIsApproved = function () {
  return this.setApproved (true);
};
Score.prototype.setIsNotApproved = function () {
  return this.setApproved (false);
};
Score.prototype.getDeviceIdentifier = function () {
  return this.udid;
};
Score.prototype.setDeviceIdentifier = function (deviceIdentifier) {
  if (!_.isNull (deviceIdentifier)) {
    this.udid = deviceIdentifier.toUDIDCase ();
    this.mod  = psutils.timeStampUTC ();
  }
  return this;
};
Score.prototype.getDeviceName = function () {
  return this.dname;
};
Score.prototype.setDeviceName = function (deviceName) {
  if (!_.isNull (deviceName)) {
    this.dname = deviceName;
    this.mod   = psutils.timeStampUTC ();
  }
  return this;
};
Score.prototype.getDNF = function () {
  return this.dnf;
};
Score.prototype.isDNF = function () {
  return this.dnf;
};
Score.prototype.setDNF = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setDNF() argument must be boolean');
  this.dnf = state;
  this.mod = psutils.timeStampUTC ();
  return this;
};
Score.prototype.setIsDNF = function () {
  return this.setDNF (true);
};
Score.prototype.setIsNotDNF = function () {
  return this.setDNF (false);
};
Score.prototype.getDQReason = function () {
  return this.dqr;
};
Score.prototype.setDQReason = function (reason) {
  this.dqr = reason || '';
  this.mod = psutils.timeStampUTC ();
};
Score.prototype.getPenaltiesReason = function () {
  return this.penr;
};
Score.prototype.setPenaltiesReason = function (reason) {
  this.penr = reason || '';
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getPopperHits = function () {
  return this.poph;
};
Score.prototype.setPopperHits = function (newPopperHits) {
  this.poph = parseInt (newPopperHits || 0);
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getPopperMisses = function () {
  return this.popm;
};
Score.prototype.setPopperMisses = function (newPopperMisses) {
  this.popm = parseInt (newPopperMisses || 0);
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getProcedurals = function () {
  return this.proc || 0;
};
Score.prototype.setProcedurals = function (newProcedurals) {
  this.proc = parseInt (newProcedurals || 0);
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getID = function () {
  return this.shtr;
};
Score.prototype.getShooterID = function () {
  return this.shtr;
};
Score.prototype.setShooterID = function (newShooterID) {
  assert (newShooterID, 'Missing UID in Score.setShooterID()');
  this.shtr = newShooterID.toUIDCase ();
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getStringTimes = function () {
  return this.str;
};
Score.prototype.setStringTimes = function (newStringTimes) {
  this.str = newStringTimes || [];
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getStringTime = function (stringNumber) {
  return this.str [stringNumber];
};
Score.prototype.getStringTimeFmt = function (stringNumber) {
  return sprintf ('%.2f', this.str [stringNumber]);
};
Score.prototype.setStringTime = function (stringNumber, newStringTime) {
  this.str [stringNumber] = parseFloat (newStringTime || '0.00');
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getStringTimesTotal = function () {
  return _.reduce (this.str || [0.00], function (sum, el) {
    return sum + el;
  }, 0);
};
Score.prototype.getTargetScores = function () {
  return this.ts;
};
Score.prototype.getTargetScoresText = function () {
  return tsDecode (this.ts);
};
Score.prototype.setTargetScores = function (newTargetScores) {
  this.ts = newTargetScores || [];
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getTargetScore = function (targetNumber) {
  return this.ts [targetNumber];
};
Score.prototype.setTargetScore = function (targetNumber, newTargetScore) {
  this.ts [targetNumber] = newTargetScore || 0;
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getTimestamp = function () {
  return this.mod;
};
Score.prototype.overrideTimestamp = function (modified) {
  this.mod = modified;
  return this;
};
Score.prototype.updateTimestamp = function () {
  this.mod  = psutils.timeStampUTC ();
};
Score.prototype.numberOfTargets = function () {
  return this.ts.length;
};
Score.prototype.numberOfStrings = function () {
  return this.str.length;
};
Score.prototype.merge = function (newScore, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (merge.rightTimestampIsNewer (self, newScore, 'mod', options)) {
    merge.compare (self, newScore, 'aprv', function (ov, nv) {changes.push (sprintf ('    Approved changed from %s to %s', ov, nv));});
    merge.compare (self, newScore, 'dnf',  function (ov, nv) {changes.push (sprintf ('    DNF changed from %s to %s', ov, nv));});
    merge.compare (self, newScore, 'dqr',  function (ov, nv) {changes.push (sprintf ('    DQ reason changed from \'%s\' to \'%s\'', ov, nv));});
    merge.compare (self, newScore, 'penr', function (ov, nv) {changes.push (sprintf ('    Penalty reason changed from \'%s\' to \'%s\'', ov, nv));}); // FIXME: Move to specific match type
    merge.compare (self, newScore, 'poph', function (ov, nv) {changes.push (sprintf ('    Popper hits changed from %s to %s', ov, nv));});
    merge.compare (self, newScore, 'popm', function (ov, nv) {changes.push (sprintf ('    Popper misses changed from %s to %s', ov, nv));});
    merge.compare (self, newScore, 'proc', function (ov, nv) {changes.push (sprintf ('    Procedurals changed from %s to %s', ov, nv));});

    merge.compareArray (self, newScore, 'str',  function (ov, nv, index) {changes.push (sprintf ('    String #%d time changed from %s to %s', index + 1, ov.getStringTimeFmt (index), nv.getStringTimeFmt (index)));});
    merge.compareArray (self, newScore, 'ts',   function (ov, nv, index) {changes.push (sprintf ('    Target #%d changed from %s to %s', index + 1, ov.hitsToText (index), nv.hitsToText (index)));}); // FIXME: Move to specific match type

    //
    //  Must be done before we update 'mod', in case the onChangeScore code
    //  also calls merge.compare.
    //
    if (_.isFunction (options.onChangeScore))
      options.onChangeScore (self, newScore, changes);

    merge.compare (self, newScore, 'mod');

    self.str   = newScore.str;
    self.ts    = newScore.ts;

    self.dname = newScore.dname;
    self.mod   = newScore.mod;
    self.shtr  = newScore.shtr;
    self.udid  = newScore.udid.toUDIDCase ();
  }

  if (changes.length)
    changes.unshift (sprintf ('  Updated score for %s', options.shooterName || '** UNKNOWN **'));

  if (err)
    pmelog.llog (pmelog.WARN, err);

  if (callback)
    callback (err, changes);

  return self;
};
Score.prototype.fixup = function () {
  this.shtr = this.shtr.toUIDCase ();
  return this;
};
Score.prototype.getAsPlainObject = function (options) {
  var self = this;
  var s = {};
  var notcompact = !options || !options.compact;

  if (notcompact || self.aprv)         s.aprv  = self.aprv;
  if (notcompact || self.dname.length) s.dname = self.dname;
  if (notcompact || self.dnf)          s.dnf   = self.dnf;
  if (notcompact || self.dqr)          s.dqr   = self.dqr;
  if (notcompact || self.mod)          s.mod   = self.mod;
  if (notcompact || self.penr.length)  s.penr  = self.penr;    // FIXME: Move to specific match type
  if (notcompact || self.poph)         s.poph  = self.poph;
  if (notcompact || self.popm)         s.popm  = self.popm;
  if (notcompact || self.proc)         s.proc  = self.proc;
  if (notcompact || self.shtr)         s.shtr  = self.shtr;
  if (notcompact || self.str)          s.str   = self.str;
  if (notcompact || self.ts)           s.ts    = self.ts;    // FIXME: Move to specific match type
  if (notcompact || self.udid.length)  s.udid  = self.udid;

  //
  //  Fixes issue in 1.683 (81) and earlier where poph defaults to 1 if not present
  //
  s.poph = self.poph || 0;

  return s;
};
Score.prototype.parse = function (jsonScore) {
  var self = this;
  var map = {
    aprv:  self.setApproved,
    dname: self.setDeviceName,
    dnf:   self.setDNF,
    dqr:   self.setDQReason,
    penr:  self.setPenaltiesReason,   // FIXME: Move to specific match type
    poph:  self.setPopperHits,
    popm:  self.setPopperMisses,
    proc:  self.setProcedurals,
    shtr:  self.setShooterID,
    str:   self.setStringTimes,
    ts:    self.setTargetScores,    // FIXME: Move to specific match type
    udid:  self.setDeviceIdentifier,
    mod:   self.overrideTimestamp,
  };

  if (!jsonScore)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonScore) {
      map [key].call (self, jsonScore [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  return self;
};

exports.Score = Score;
