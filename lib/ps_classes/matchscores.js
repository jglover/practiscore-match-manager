'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var sprintf = require ('sprintf-js').sprintf;
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

//
//  Match scores are an array of objects, where each object is a stage number,
//  stage UUID, and an array of scores. Each score is an object, containing the
//  score, shooter UID, etc.
//
//  Although the match scores are in stage number order, we're going to rely
//  solely on the UUID. We'll use the leftMatchScores as the master. If a stage
//  UUID from rightMatchScores exists in leftMatchScores, we'll merge. If it does
//  not exist, we'll append the entire rightMatchScores stage results to
//  leftMatchScores. When we're done, we'll loop through and set stage_number
//  to it's corresponding array index + 1.
//
var mergeScores = function (newMatchScores, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (!newMatchScores.getNumberOfStageScores ()) {
    pmelog.llog (pmelog.INFO, '%s: No scores defined in match to be merged, returning early', options.deviceName);
    if (callback)
      callback (null, changes);
    return self;
  }

  _.each (newMatchScores.getMatchScores (), function (newStageScores) {
    var newStageScoresID = newStageScores.getID ();
    var stage = options.matchdef.getStageByUUID (newStageScoresID);
    var selfStageScores = self.findStageByID (newStageScoresID);

    options = _.merge (options, {stage: stage, stageName: stage.getName ()});

    //
    //  If the new stage scores don't exist in the current match, then create
    //  a new stages scores entry in our match, using the new stages scores
    //  UUID ('clone' it)
    //
    if (_.isUndefined (selfStageScores)) {
      self.cloneStage (newStageScores);
      selfStageScores = self.findStageByID (newStageScoresID);

      if (!selfStageScores) {
        pmelog.llog (pmelog.ERROR, 'Couldn\'t find stage by ID in mergeScores(), ID=' + newStageScoresID);

        _.each (self.match_scores, function (stageScores) {
          pmelog.llog (pmelog.ERROR, '  Known stage ID %s', stageScores.getID ());
        });

        err = 'Cannot find stage matching ID ' + newStageScoresID;
      }
    }

    if (!err) {
      selfStageScores.merge (newStageScores, options, function (scoreErr, scoreChanges) {
        err = scoreErr;
        changes = changes.concat (scoreChanges);
      });
    }
  });

  if (err)
    pmelog.llog (pmelog.WARN, err);

  if (callback)
    callback (err, changes);

  return self;
};

/*
var mergeScoresHistory = function (rightScoresHistory, options, callback) {
  var self = this;
  var err = null;
  var changed = false;

  if (!rightScoresHistory.length) {
    pmelog.llog (pmelog.INFO, '%s: Right scores history is empty, nothing to do', options.deviceName);
  } else if (!leftScoresHistory.length) {
    leftScoresHistory.setScoresHistory = rightScoresHistory.getScoresHistory ());
    changed = true;
    pmelog.llog (pmelog.INFO, '%s: Left scores history is empty, using right scores history', options.deviceName);
  } else {
    _.each (rightScoresHistory, function (rightStageHistory) {
      pmelog.llog (pmelog.DEBUG, '%s: Processing stage history', options.deviceName);
      stage_history = stage_history;
    });
  }

  if (err)
    pmelog.llog (pmelog.WARN, err);

  if (callback)
    callback (err);

  return self;
};
*/

//
//
//
var MatchScores = function (options, matchUUID, callback) {
  var self = this;

  if (_.isArray (matchUUID))
    matchUUID = matchUUID [0] || null;

  if (matchUUID)
    matchUUID = matchUUID.toUUIDCase ();

  self._pendingChanges = false;
  self._fieldParsed    = {};

  self.match_id             = matchUUID || psutils.generateUUID ();
  self.match_scores         = [];  // array of StageScore objects
  self.match_scores_history = {};

  if (callback)
    callback (null, self);

  return self;
};

MatchScores.prototype.className = function () {
  return 'MatchScores';
};
MatchScores.prototype.getID = function () {
  return this.match_id;
};
MatchScores.prototype.hasScores = function () {
  return this.match_scores.length ? true : false;
};
MatchScores.prototype.findStageByID = function (stageID) {
  var self = this;

  stageID = stageID.toUUIDCase ();

  return _.find (self.match_scores, function (stageScores) {
    return stageScores.getID () === stageID;
  });
};
MatchScores.prototype.getNumberOfStageScores = function () {
  return this.match_scores.length;
};
MatchScores.prototype.getMatchScores = function () {
  return this.match_scores;
};
MatchScores.prototype.setMatchScores = function (newScores) {
  if (newScores.className () !== 'MatchScores')
    throw new TypeError ('MatchScores.setMatchScores parameter must be MatchScores object');
  this.match_scores = newScores || [];
  this._pendingChanges = true;
  return this;
};
MatchScores.prototype.getStage = function (stageNumber) {
  stageNumber = (stageNumber || 1) - 1;
  return this.match_scores [stageNumber] || this.newStageScores (stageNumber);
};
MatchScores.prototype.setStage = function (stageNumber, newStageScores) {
  stageNumber = (stageNumber || 1) - 1;
  this.match_scores [stageNumber] = newStageScores || this.newStageScores (stageNumber);
  this._pendingChanges = true;
  return this;
};
MatchScores.prototype.addStage = function (stageScores) {
  if (stageScores.className () !== 'StageScores')
    throw new TypeError ('MatchScores.addStage parameter must be StageScores object');
  this.match_scores.push (stageScores || this.newStageScores (this.match_scores.length + 1));
  this._pendingChanges = true;
  return this;
};
MatchScores.prototype.cloneStage = function (stageScores) {
  if (stageScores.className () !== 'StageScores')
    throw new TypeError ('MatchScores.cloneStage parameter must be StageScores object');
  this.match_scores.push (this.newStageScores (this.match_scores.length + 1, stageScores.getID ()));
  this._pendingChanges = true;
  return this;
};
MatchScores.prototype.getScoresByID = function (shooterID) {
  var self = this;
  var shooterScores = [];

  _.each (self.match_scores, function (stagescores) {
    var score = stagescores.findScoreByID (shooterID);

    if (score)
      shooterScores.push ({uuid: stagescores.getID (), score: score});
  });

  return shooterScores.length ? shooterScores : null;
};
MatchScores.prototype.getScoresHistory = function () {
  return this.match_scores_history;
};
MatchScores.prototype.setScoresHistory = function (newScoresHistory) { // FIXME = Check for instance of StageScoresHistory?
  if (newScoresHistory.className () !== 'StageScoresHistory')
    throw new TypeError ('MatchScores.setScoresHistory parameter must be StageScoresHistory object');
  this.match_scores_history = newScoresHistory || {};
  this._pendingChanges = true;
  return this;
};
MatchScores.prototype.addScoresHistory = function (stageUUID, shooterUID, score) { // Check for instance of Score?
  if (score.className () !== 'Score')
    throw new TypeError ('MatchScores.addScoresHistory parameter must be Score object');
  stageUUID = stageUUID.toUUIDCase ();
  shooterUID = shooterUID.toUIDCase ();
  this.match_scores_history [stageUUID] = this.match_scores_history [stageUUID] || {};
  this.match_scores_history [stageUUID][shooterUID] = this.match_scores_history [stageUUID][shooterUID] || [];
  this.match_scores_history [stageUUID][shooterUID].push (score);
  this._pendingChanges = true;
  return this;
};
MatchScores.prototype.overrideID = function (newUUID) {
  assert (newUUID, 'Missing UUID in MatchScores.overrideID()');
  this.match_id = newUUID.toUUIDCase ();
  this._pendingChanges = true;
  return this;
};
MatchScores.prototype.numberOfStages = function () {
  return this.match_scores.length;
};
MatchScores.prototype.nextStageNumber = function () {
  return this.match_scores.length + 1;
};
MatchScores.prototype.getPendingChanges = function () {
  return this._pendingChanges;
};
MatchScores.prototype.setPendingChanges = function (state) {
  this._pendingChanges = state ? true : false;
  return this;
};
MatchScores.prototype.getNewestTimestamp = function () {
  var self = this;
  var ts = '';
  var t;

  _.each (self.match_scores, function (stagescores) {
    if ((t = stagescores.getNewestTimestamp ()) > ts)
      ts = t;
  });

  return ts.length ? ts : null;
};
MatchScores.prototype.fixup = function (parent, options) {
  var self = this;

  options = options || {};

  self.match_id = self.match_id.toUUIDCase ();

  _.each (self.match_scores, function (stage) {
    stage.fixup (parent, options);

    _.each (stage.stage_stagescores, function (score) {
      score.fixup (parent, options);
    });
  });

  _.each (self.match_scores_history, function (stageHistory, stageKey) {
    if (stageKey.match (/[a-f]/g)) {
      delete self.match_scores_history [stageKey];
      self.match_scores_history [stageKey.toUUIDCase ()] = stageHistory;
    }

    _.each (stageHistory, function (shooterHistory, shooterKey) {
      if (shooterKey.match (/[a-f]/g)) {
        delete stageHistory [shooterKey];
        stageHistory [shooterKey.toUIDCase ()] = shooterHistory;

        _.each (shooterHistory, function (history) {
          history.shtr = history.shtr.toUIDCase ();
          history.udid = history.udid.toUDIDCase ();
        });
      }
    });
  });

  return self;
};
MatchScores.prototype.merge = function (newMatchScores, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (!options.ignoreUUID && (self.getID () !== newMatchScores.getID ())) {
    err = sprintf ('Scores UUIDs don\'t match (mine=%s, new=%s)', self.getID (), newMatchScores.getID ());
    pmelog.llog (pmelog.ERROR, err);
  }

  if (!err) {
    mergeScores.call (self, newMatchScores, options, function (scoresErr, scoresChanges) {
      err = scoresErr;
      changes = changes.concat (scoresChanges);
    });
  }

/*
  if (!err) {
    mergeScoresHistory.call (self, newMatchScores, options, function (historyErr, historyChnages) {
      err = historyErr;
      changes = changes.concat (historyChanges);
    });
  }
*/

  if (callback)
    callback (err, changes);

  return self;
};
MatchScores.prototype.getAsPlainObject = function (options) {
  var self = this;
  var s = {};

  options = options || {};

  s.match_id = self.match_id;

  if (self.match_scores.length) {
    s.match_scores = [];

    _.each (self.match_scores, function (stagescore) {
      s.match_scores.push (stagescore.getAsPlainObject (options));
    });
  }

  return s;
};
MatchScores.prototype.parse = function (jsonMatchScores) {
  var self = this;
  var map = {
    match_id: self.overrideID,
  };

  if (!jsonMatchScores)
    return;

  _.each (jsonMatchScores.match_scores, function (stageScores) {
    self.addStage (self.newStageScores ().parse (stageScores));
  });

  _.each (jsonMatchScores.match_scores_history, function (stageHistory, stageUUID) {
    _.each (stageHistory, function (shooterHistory, shooterUID) {
      _.each (shooterHistory, function (score) {
        self.addScoresHistory (stageUUID, shooterUID, self.newHistoryScore ().parse (score));
      });
    });
  });

  try {
    self._fieldParsed = {};

    _.each (_.keys (map), function (key) {
      if (key in jsonMatchScores) {
        map [key].call (self, jsonMatchScores [key]);
        self._fieldParsed [key] = true;
      }
    });
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e);
    pmelog.ldirex (pmelog.ERROR, jsonMatchScores);
    throw (e);
  }

  return self;
};

exports.MatchScores = MatchScores;
