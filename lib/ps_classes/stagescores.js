'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var sprintf = require ('sprintf-js').sprintf;
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

//
//
//
var StageScores = function (stageNumber, stageUUID) {
  var self = this;

  if (_.isArray (stageNumber)) {
    stageUUID = stageNumber [1] || null;
    stageNumber = stageNumber [0];
  }

  if (stageUUID)
    stageUUID = stageUUID.toUUIDCase ();

  self._pendingChanges = false;
  self._fieldParsed    = {};

  self.stage_number      = parseInt (stageNumber || 0);
  self.stage_stagescores = [];  // array of Score objects
  self.stage_uuid        = stageUUID || psutils.generateUUID ();

  return self;
};

StageScores.prototype.className = function () {
  return 'StageScores';
};
StageScores.prototype.getNumber = function () {
  return this.stage_number;
};
StageScores.prototype.setNumber = function (newNumber) {
  this.stage_number = parseInt (newNumber || 0);
  return this;
};
StageScores.prototype.getNumberOfScores = function () {
  return this.stage_stagescores.length;
};
StageScores.prototype.getStageScores = function () {
  return this.stage_stagescores;
};
StageScores.prototype.setStageScores = function (newStageScores) {
  this.stage_stagescores = newStageScores || [];
  return this;
};
StageScores.prototype.addScore = function (newScore) {
  if (newScore.className () !== 'Score')
    throw new TypeError ('StageScores.addScore parameter must be Score object');
  this.stage_stagescores.push (newScore);
  return this;
};
StageScores.prototype.getID = function () {
  return this.stage_uuid;
};
StageScores.prototype.overrideID = function (newUUID) {
  assert (newUUID, 'Missing UUID in StageScores.overrideID()');
  this.stage_uuid = newUUID.toUUIDCase () || psutils.generateUUID ();
  return this;
};
StageScores.prototype.numberOfScores = function () {
  return this.stage_stagescores.length;
};
StageScores.prototype.findScoreByID = function (scoreID) {
  var self = this;

  scoreID = scoreID.toUUIDCase ();

  return _.find (self.stage_stagescores, function (score) {
    return score.getID () === scoreID;
  });
};
StageScores.prototype.getNewestTimestamp = function () {
  var self = this;
  var ts = '';
  var t;

  _.each (self.stage_stagescores, function (score) {
    if ((t = score.getTimestamp ()) > ts)
      ts = t;
  });

  return ts;
};
StageScores.prototype.fixup = function () {
  this.stage_uuid = this.stage_uuid.toUUIDCase ();
  this.stage_number *= 1;

  return this;
};
StageScores.prototype.merge = function (newStageScores, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (!newStageScores.getNumberOfScores ()) {
    pmelog.llog (pmelog.INFO, '%s: No new scores for stage %s', options.deviceName, options.stageName);
  } else {
    _.each (newStageScores.getStageScores (), function (newScore) {
      var shooter = options.matchdef.getShooterByUID (newScore.getShooterID ());
      var selfScore = self.findScoreByID (newScore.getID ());

      if (_.isUndefined (shooter)) {
        pmelog.llog (pmelog.ERROR, '%s: Shooter UUID %s doesn\'t exist in match!', options.deviceName, newScore.getShooterID ());
      } else if (!_.isUndefined (selfScore)) {
        selfScore.merge (newScore, {shooterName: shooter.getFullName ()}, function (scoreErr, scoreChanges) {
          err = scoreErr;
          changes = changes.concat (scoreChanges);
        });
      } else {
        self.addScore (newScore);
        changes.push (sprintf ('  Adding new score for %s', shooter.getFullName ()));
      }
    });
  }

  if (changes.length)
    changes.unshift (sprintf ('Updating scores for stage %s', options.stageName || '** UNKNOWN **'));

  if (callback)
    callback (err, changes);

  return self;
};
StageScores.prototype.getPendingChanges = function () {
  return this._pendingChanges;
};
StageScores.prototype.setPendingChanges = function (state) {
  this._pendingChanges = state ? true : false;
  return this;
};
StageScores.prototype.getAsPlainObject = function (options) {
  var self = this;
  var s = {};
  var notcompact = !options || !options.compact;

  s.stage_number = self.stage_number;
  s.stage_uuid   = self.stage_uuid;

  if (notcompact || self.stage_stagescores.length) {
    s.stage_stagescores = [];

    _.each (self.stage_stagescores, function (score) {
      s.stage_stagescores.push (score.getAsPlainObject (options));
    });
  }

  return s;
};
StageScores.prototype.parse = function (jsonStageScores) {
  var self = this;
  var map = {
    stage_number: self.setNumber,
    stage_uuid:   self.overrideID,
  };

  if (!jsonStageScores)
    return self;

  _.each (jsonStageScores.stage_stagescores, function (score) {
    self.addScore (self.newScore ().parse (score));
  });

  _.each (_.keys (map), function (key) {
    if (key in jsonStageScores) {
      map [key].call (self, jsonStageScores [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  return self;
};

exports.StageScores = StageScores;
