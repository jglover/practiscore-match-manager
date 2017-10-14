'use strict';

var shooter = require ('../ps_classes/shooter');
var target = require ('../ps_classes/target');
var stage = require ('../ps_classes/stage');
var matchdef = require ('../ps_classes/matchdef');
var score = require ('../ps_classes/score');
var stagescores = require ('../ps_classes/stagescores');
var matchscores = require ('../ps_classes/matchscores');
var matchlog = require ('../ps_classes/matchlog');

//
//
//
var Shooter = function () {
  shooter.Shooter.apply (this, Array.prototype.slice.call (arguments));

  shooter.Shooter.prototype.setClass.call (this, 'U');
  shooter.Shooter.prototype.setDivision.call (this, 'OPEN');

  return this;
};

Shooter.prototype = Object.create (shooter.Shooter.prototype);

//
//
//
var Target = function () {
  return target.Target.apply (this, Array.prototype.slice.call (arguments));
};

Target.prototype = Object.create (target.Target.prototype);

//
//
//
var Stage = function () {
  stage.Stage.apply (this, Array.prototype.slice.call (arguments));

  stage.Stage.prototype.setScoringType.call (this, 'IDPA');
  // stage.Stage.prototype.setNumber.call (this, stageNumber);

  return this;
};

Stage.prototype = Object.create (stage.Stage.prototype);

//
//
//
var Matchdef = function () {
  matchdef.Matchdef.apply (this, Array.prototype.slice.call (arguments));

  matchdef.Matchdef.prototype.setMatchType.call (this, 'idpa');
  matchdef.Matchdef.prototype.setClasses.call (this, ['DM', 'MA', 'EX', 'SS', 'MM', 'NV', 'UN']);
  matchdef.Matchdef.prototype.setDivisions.call (this, ['CDP', 'ESP', 'SSP', 'SSR', 'ESR', 'BUG']);
  matchdef.Matchdef.prototype.addPenalty.call (this, {name: 'Procedural', value: 3, multiple: true});
  matchdef.Matchdef.prototype.addPenalty.call (this, {name: 'Hits on Non-Threat', value: 5, multiple: true});
  matchdef.Matchdef.prototype.addPenalty.call (this, {name: 'Failure to Neutralize', value: 5, multiple: true});
  matchdef.Matchdef.prototype.addPenalty.call (this, {name: 'Failure to Do Right', value: 20, multiple: true});
};

Matchdef.prototype = Object.create (matchdef.Matchdef.prototype);

Matchdef.prototype.getDivisions = function () {
  return matchdef.Matchdef.prototype.getDivisions.call (this);
};
Matchdef.prototype.setDivisions = function (newDivisions) {
  matchdef.Matchdef.prototype.setDivisions.call (this, newDivisions);
};

//
//
//
var Score = function () {
  return score.Score.apply (this, Array.prototype.slice.call (arguments));
};

Score.prototype = Object.create (score.Score.prototype);

//
//
//
var StageScores = function () {
  return stagescores.StageScores.apply (this, Array.prototype.slice.call (arguments));
};

StageScores.prototype = Object.create (stagescores.StageScores.prototype);

//
//
//
var MatchScores = function () {
  return matchscores.MatchScores.apply (this, Array.prototype.slice.call (arguments));
};

MatchScores.prototype = Object.create (matchscores.MatchScores.prototype);

MatchScores.prototype.addStage = function (stageScores) {
  matchscores.MatchScores.prototype.addStage.call (this, stageScores || new StageScores (matchscores.MatchScores.prototype.nextStageNumber.call (this)));
  return this;
};

//
//  From MatchLog:
//    ?
//  Adds:
//    (none)
//
var MatchLog = function () {
  return matchlog.MatchLog.apply (this, Array.prototype.slice.call (arguments));
};

MatchLog.prototype = Object.create (matchlog.MatchLog.prototype);

//
//
//
var Lookups = function () {
  return {
    matchlevels: {
      'ProAm': 'ProAm',
    },
    ages: {
      'ADULT': 'Adult',
    },
    divisions: {
      'AM Limited' : 'Amateur Limited',
      'AM Open'    : 'Amateur Open',
      'PRO Limited': 'Pro Limited',
      'PRO Open'   : 'Pro Open',
    },
    powerfactors: {
      'MAJOR': 'Major',
    },
    genders: {
      'FEMALE' : 'Female',
      'MALE'   : 'Male',
    },
    classes: {
      'A'  : 'A',
      'B'  : 'B',
      'C'  : 'C',
      'D'  : 'D',
      'G'  : 'G',
      'M'  : 'M',
      'U'  : 'U',
    },
  };
};

//
//
//
exports.Shooter = Shooter;
exports.Target = Target;
exports.Stage = Stage;
exports.Matchdef = Matchdef;
exports.Score = Score;
exports.StageScores = StageScores;
exports.MatchScores = MatchScores;
exports.MatchLog = MatchLog;
exports.Lookups = Lookups;
