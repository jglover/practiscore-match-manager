'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

//
//  stage_classifier        <boolean>
//  stage_classifiercode    <string>
//  stage_deleted           <boolean>
//  stage_modifieddate      <string>
//  stage_name              <string>
//  stage_noshoots          <boolean> // FIXME: Move to match type
//  stage_number            <integer>
//  stage_poppers           <integer> // FIXME: Move to match type
//  stage_scoretype         <string>
//  stage_strings           <integer>
//  stage_targets           <array:Target> // FIXME: Move to match type
//  stage_uuid              <string>
//
var Stage = function (options) {
  var self = this;

  options = options || {};

  if (!options.stage_number) {
    pmelog.ldirex (pmelog.DEBUG, options);
    throw new TypeError ('Why is stageNumber 0 or not defined?');
  }

  if (options.stageID)
    options.stageID = options.stageID.toUUIDCase ();

  self._pendingChanges = false;
  self._fieldParsed    = {};

  self.stage_classifier        = false;
  self.stage_classifiercode    = '';
  self.stage_deleted           = false;
  self.stage_modifieddate      = options.stageTS || psutils.timeStampUTC ();
  self.stage_name              = '';
  self.stage_noshoots          = true; // FIXME: Move to match type
  self.stage_number            = options.stage_number || 0;
  self.stage_poppers           = 0; // FIXME: Move to match type
  self.stage_scoretype         = '';
  self.stage_strings           = 1;
  self.stage_targets           = []; // FIXME: Move to match type
  self.stage_uuid              = options.stageID || psutils.generateUUID ();

  return self;
};

Stage.prototype.className = function () {
  return 'Stage';
};
Stage.prototype.setIsClassicTargets = function () {
  return this.setClassicTargets (true);
};
Stage.prototype.setIsNotClassicTargets = function () {
  return this.setClassicTargets (false);
};
Stage.prototype.getClassifier = function () {
  return this.stage_classifier;
};
Stage.prototype.isClassifier = function () {
  return this.stage_classifier === true;
};
Stage.prototype.isNotClassifier = function () {
  return this.stage_classifier === false;
};
Stage.prototype.setClassifier = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setClassifier() argument must be boolean');
  this.stage_classifier = state;
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.setIsClassifier = function () {
  return this.setIsClassifier (true);
};
Stage.prototype.setIsNotClassifier = function () {
  return this.setIsClassifier (false);
};
Stage.prototype.getClassifierCode = function () {
  return this.stage_classifiercode;
};
Stage.prototype.setClassifierCode = function (newClassifierCode) {
  this.stage_classifiercode = newClassifierCode || '';
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.getDeleted = function () {
  return this.stage_deleted;
};
Stage.prototype.isDeleted = function () {
  return this.stage_deleted;
};
Stage.prototype.isNotDeleted = function () {
  return !this.stage_deleted;
};
Stage.prototype.setDeleted = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setDeleted() argument must be boolean');
  this.stage_deleted = state;
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
/*
Stage.prototype.getMaxStringTime = function () {
  return this.stage_maxstringtime || 0;
};
Stage.prototype.setMaxStringTime = function (mst) {
  this.stage_maxstringtime = mst || 0;
  return this;
};
*/
Stage.prototype.getName = function () {
  return this.stage_name;
};
Stage.prototype.setName = function (newName) {
  this.stage_name = newName || '';
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.getNoShoots = function () {
  return this.stage_noshoots;
};
Stage.prototype.setNoShoots = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setNoShoots() argument must be boolean');
  this.stage_noshoots = state;
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.setHasNoShoots = function () {
  return this.setNoShoots (true);
};
Stage.prototype.setHasNoNoShoots = function () {
  return this.setNoShoots (false);
};
Stage.prototype.hasNoShoots = function () {
  return this.stage_noshoots === true;
};
Stage.prototype.hasNoNoShoots = function () {
  return this.stage_noshoots === false;
};
Stage.prototype.getNumber = function () {
  return this.stage_number;
};
Stage.prototype.setNumber = function (newNumber) {
  this.stage_number = parseInt (newNumber || 0);
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.getPoppers = function () {
  return this.stage_poppers;
};
Stage.prototype.setPoppers = function (newPoppers) {
  this.stage_poppers = parseInt (newPoppers || 0);
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.getScoringType = function () {
  return this.stage_scoretype;
};
Stage.prototype.setScoringType = function (newScoringType) {
  this.stage_scoretype = newScoringType || '';
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.getStrings = function () {
  return this.stage_strings;
};
Stage.prototype.setStrings = function (newStrings) {
  this.stage_strings = parseInt (newStrings || 1);
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.getTargets = function () {
  return this.stage_targets;
};
Stage.prototype.setTargets = function (newTargets) {
  this.stage_targets = newTargets || [];
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.getTargetCount = function () {
  return this.stage_targets.length;
};
Stage.prototype.getTarget = function (targetNumber) {
  if (_.isUndefined (targetNumber))
    throw new TypeError ('getTarget() argument may not be undefined');
  if (isNaN (parseInt (targetNumber)))
    throw new TypeError ('getTarget() argument must be a number');

  targetNumber = parseInt (targetNumber);

  if ((targetNumber < 0) || (targetNumber >= this.stage_targets.length))
    throw new RangeError ('getTarget() argument < 0 or greater than number of targets');

  return this.stage_targets [targetNumber];
};
Stage.prototype.getTargets = function (firstTarget, lastTarget) {
  return this.stage_targets.slice (firstTarget, lastTarget);
};
Stage.prototype.newTarget = function () {
  return new this.Target ();
};
Stage.prototype.addTarget = function (newTarget, options) {
  if (!_.isUndefined (newTarget)) {
    options = options || {};
    this.stage_targets.push (newTarget);
    this.stage_modifieddate = (options.tsKeep ? this.stage_modifieddate : null) || psutils.timeStampUTC ();
    this.stage_modifieddate = psutils.timeStampUTC ();
  }
  return this;
};
Stage.prototype.addTargets = function (newTargets) {
  var self = this;
  if (_.isArray (newTargets)) {
    _.each (newTargets, function (nt) {
      self.addTarget (nt);
    });
  }
  return self;
};
Stage.prototype.removeTargets = function (firstTarget, lastTarget) {
  this.stage_targets.splice (firstTarget, lastTarget);
  return this;
};
Stage.prototype.getID = function () {
  return this.stage_uuid;
};
Stage.prototype.overrideID = function (newUUID) {
  assert (newUUID, 'Missing UUID in Stage.overrideID()');
  this.stage_uuid = newUUID.toUUIDCase ();
  return this;
};
Stage.prototype.overrideTimestamp = function (newTS) {
  this.stage_modifieddate = newTS || psutils.timeStampUTC ();
  return this;
};
Stage.prototype.getNewestTimestamp = function () {
  return this.stage_modifieddate;
};
Stage.prototype.numberOfTargets = function () {
  return this.stage_targets.length;
};
Stage.prototype.fixup = function (parent, stage_number) {
  if (_.isUndefined (stage_number))
    throw new TypeError ('Why is stage_number undefined?');

  this.stage_name = this.stage_name.trim ();
  this.stage_number = stage_number;
  this.stage_uuid = this.stage_uuid.toUUIDCase ();

  return this;
};
Stage.prototype.merge = function (newStage, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert (_.isObject (options), 'Stage.prototype.merge: options is not Object');
  assert (_.isFunction (callback), 'Stage.prototype.merge: callback is not function');
  assert (newStage, 'Stage.prototype.merge: newStage cannot be null or undefined');

  if (merge.rightTimestampIsNewer (self, newStage, 'stage_modifieddate', options)) {
    merge.compare (self, newStage, 'stage_classifier',        function (ov, nv) {changes.push (sprintf ('    Classifier changed from %s to %s', ov, nv));});
    merge.compare (self, newStage, 'stage_classifiercode',    function (ov, nv) {changes.push (sprintf ('    Classifier code changed from \'%s\' to \'%s\'', ov, nv));});
    merge.compare (self, newStage, 'stage_deleted',           function (ov, nv) {changes.push (sprintf ('    Deleted changed from \'%s\' to \'%s\'', ov, nv));});
    merge.compare (self, newStage, 'stage_name',              function (ov, nv) {changes.push (sprintf ('    Stage name changed from \'%s\' to \'%s\'', ov, nv));});
    merge.compare (self, newStage, 'stage_noshoots',          function (ov, nv) {changes.push (sprintf ('    No-shoots changed from %s to %s', ov, nv));}); // FIXME: Move to match type
    merge.compare (self, newStage, 'stage_number',            function (ov, nv) {changes.push (sprintf ('    Stage number changed from %s to %s', ov, nv));});
    merge.compare (self, newStage, 'stage_poppers',           function (ov, nv) {changes.push (sprintf ('    Poppers changed from %s to %s', ov, nv));}); // FIXME: Move to match type
    merge.compare (self, newStage, 'stage_scoretype',         function (ov, nv) {changes.push (sprintf ('    Scoring type changed from \'%s\' to \'%s\'', ov, nv));});
    merge.compare (self, newStage, 'stage_strings',           function (ov, nv) {changes.push (sprintf ('    Strings changed from %s to %s', ov, nv));});
    merge.compare (self, newStage, 'stage_modifieddate');

    if (_.isFunction (options.onChangeStage))
      options.onChangeStage (self, newStage, changes);
  }

  if (changes.length)
    changes.unshift (sprintf ('  Stage \'%s\' modified:', self.getName () || '** UNKNOWN **'));

  if (err)
    pmelog.llog (pmelog.WARN, err);

  if (callback)
    callback (err, changes);

  return self;
};
Stage.prototype.update = function (stageInfo, options, callback) {
  var self = this;
  var now = psutils.timeStampUTC ();
  var list = {
    stage_modifieddate: [
      'stage_classifier',
      'stage_classifiercode',
      'stage_deleted',
      'stage_name',
      'stage_number',
      'stage_strings',
      'stage_scoretype',
    ],
  };

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};
  options = _.merge (options, {nodebug: true});

  stageInfo._fieldParsed = stageInfo._fieldParsed || [];

  _.each (list, function (fields, tsName) {
    _.each (fields, function (fieldName) {
      if (_.has (stageInfo, fieldName)) {
        if (_.isString (stageInfo [fieldName]))
          stageInfo [fieldName] = stageInfo [fieldName].trim ();
        if (!_.isEqual (self [fieldName], stageInfo [fieldName])) {
          stageInfo._fieldParsed [fieldName] = true;
          stageInfo [tsName] = now;
          stageInfo._fieldParsed [tsName] = true;
        }
      }
    });
  });

  self.merge (stageInfo, options, function (err, changes) {
    if (callback)
      callback (err, changes);
  });

  return self;
};
Stage.prototype.getAsPlainObject = function (options) {
  var self = this;
  var s = {};
  var notcompact = !options || !options.compact;

  if (notcompact || self.stage_classifier)        s.stage_classifier        = self.stage_classifier;
  if (notcompact || self.stage_classifiercode)    s.stage_classifiercode    = self.stage_classifiercode;
  if (notcompact || self.stage_deleted)           s.stage_deleted           = self.stage_deleted;
  if (notcompact || self.stage_modifieddate)      s.stage_modifieddate      = self.stage_modifieddate;
  if (notcompact || self.stage_name)              s.stage_name              = self.stage_name;
  if (notcompact || self.stage_noshoots)          s.stage_noshoots          = self.stage_noshoots; // FIXME Move to match type
  if (notcompact || self.stage_number)            s.stage_number            = self.stage_number;
  if (notcompact || self.stage_poppers)           s.stage_poppers           = self.stage_poppers; // FIXME Move to match type
  if (notcompact || self.stage_scoretype)         s.stage_scoretype         = self.stage_scoretype;
  if (notcompact || self.stage_strings)           s.stage_strings           = self.stage_strings;
  if (notcompact || self.stage_uuid)              s.stage_uuid              = self.stage_uuid;

  if (notcompact || self.stage_targets) {
    s.stage_targets = [];

    _.each (self.stage_targets, function (target) {
      s.stage_targets.push (target.getAsPlainObject (options));
    });
  }

  return s;
};
Stage.prototype.parse = function (jsonStage) {
  var self = this;
  var map = {
    stage_classifier:        self.setClassifier,
    stage_classifiercode:    self.setClassifierCode,
    stage_deleted:           self.setDeleted,
    stage_name:              self.setName,
    stage_noshoots:          self.setNoShoots,  // FIXME: Move to match type
    stage_number:            self.setNumber,
    stage_poppers:           self.setPoppers, // FIXME: Move to match type
    stage_scoretype:         self.setScoringType,
    stage_strings:           self.setStrings,
    stage_uuid:              self.overrideID,
    stage_modifieddate:      self.overrideTimestamp,
  };

  if (!jsonStage)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonStage) {
      map [key].call (self, jsonStage [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  return self;
};

exports.Stage = Stage;
