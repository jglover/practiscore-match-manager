'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var sprintf = require ('sprintf-js').sprintf;
var psutils = require ('../utils');
var shooter = require ('../ps_classes/shooter');
var bonus = require ('../ps_classes/bonus');
var penalty = require ('../ps_classes/penalty');
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
//  From Shooter:
//    mod_dl    <string>
//    mod_dq    <string>
//    mod_dv    <string>
//    mod_pf    <string>
//    mod_pr    <string>
//    mod_sq    <string>
//    sh_age    <string>
//    sh_cc     <string>
//    sh_ctgs   <array:JSON (array of strings)>
//    sh_del    <boolean>
//    sh_dq     <boolean>
//    sh_dqrule <string>
//    sh_dvp    <string>
//    sh_eml    <string>
//    sh_fn     <string>
//    sh_frn    <boolean>
//    sh_gen    <string>
//    sh_grd    <string>
//    sh_id     <string>
//    sh_law    <boolean>
//    sh_lge    <boolean>
//    sh_lgp    <boolean>
//    sh_ln     <string>
//    sh_mil    <boolean>
//    sh_mod    <string>
//    sh_num    <integer>
//    sh_pf     <string>
//    sh_ph     <string>
//    sh_sqd    <integer>
//    sh_uid    <string>
//    sh_uuid   <string>
//    sh_wlk    <boolean>
//  Adds:
//    (none)
//
var Shooter = function () {
  shooter.Shooter.apply (this, Array.prototype.slice.call (arguments));

  shooter.Shooter.prototype.setClass.call (this, 'U');
  shooter.Shooter.prototype.setDivision.call (this, 'AM Limited');

  return this;
};

Shooter.prototype = Object.create (shooter.Shooter.prototype);

//
//  From Target:
//    target_deleted     <boolean>
//    target_maxnpms     <integer>
//    target_number      <integer>
//    target_reqshots    <integer>
//  Adds:
//    target_nraTargDesc <array:array (desc:string, points:string)>
//
var Target = function () {
  target.Target.apply (this, Array.prototype.slice.call (arguments));

  this.target_nraTargDesc = [];

  return this;
};

Target.prototype = Object.create (target.Target.prototype);

Target.prototype.getNraTargDesc = function () {
  return this.target_nraTargDesc;
};
Target.prototype.setNraTargDesc = function (newDesc) {
  this.target_nraTargDesc = newDesc;
  return this;
};

//
//  From Stage:
//    stage_classifier        <boolean>
//    stage_classifiercode    <string>
//    stage_maxStringTime     <float>
//    stage_modifieddate      <string>
//    stage_name              <string>
//    stage_noshoots          <boolean>
//    stage_number            <integer>
//    stage_poppers           <integer>
//    stage_scoretype         <string ("TimePlus", ?)>
//    stage_strings           <integer>
//    stage_tppoints          <integer>
//    stage_uuid              <string>
//  Adds:
//    (none)
//
var Stage = function () {
  stage.Stage.apply (this, Array.prototype.slice.call (arguments));

  stage.Stage.prototype.setScoringType.call (this, 'ProAm');
  // stage.Stage.prototype.setNumber.call (this, stageNumber);

  return this;
};

Stage.prototype = Object.create (stage.Stage.prototype);

Stage.prototype.setScoringType = function (newScoringType) {
  if ((newScoringType !== 'ProAm') && (newScoringType !== 'TimePlusCustom')) {
    throw new ConversionError ('setScoringType parameter must be "ProAm" or "TimePlusCustom"');
  }
  stage.Stage.prototype.setScoringType.call (this, newScoringType);
  return this;
};
Stage.prototype.isProAm = function () {
  return this.stage_scoretype === 'ProAm';
};
Stage.prototype.isTimePlusCustom = function () {
  return this.stage_scoretype === 'TimePlusCustom';
};
Stage.prototype.newTarget = function () {
  return new Target (Array.prototype.slice.call (arguments));
};

//
//  From Matchdef:
//    match_approvescores          <boolean>
//    match_cats                   <array:string>
//    match_cls                    <array:string>
//    match_creationdate           <string>
//    match_ctgs                   <string:JSON (array of strings)>
//    match_date                   <string>
//    match_id                     <string>
//    match_logenabled             <boolean>
//    match_logtoken               <string>
//    match_matchpw                <string>
//    match_modifieddate           <string>
//    match_name                   <string>
//    match_owner                  <boolean>
//    match_readonly               <boolean>
//    match_secure                 <boolean>
//    match_shooters               <array:Shooter>
//    match_stages                 <array:Stage>
//    match_type                   <string>
//    match_unsentlogwarningscount <integer>
//    match_useOpenSquadding       <boolean>
//    version                      <string>
//  Adds:
//    match_bonuses                <array:Bonus>
//    match_penalties              <array:Penalty>
//
var Matchdef = function () {
  matchdef.Matchdef.apply (this, Array.prototype.slice.call (arguments));

  this.match_bonuses = [];
  this.match_penalties = [];

  matchdef.Matchdef.prototype.setMatchType.call (this, 'proam');
  matchdef.Matchdef.prototype.setClasses.call (this, ['G', 'M', 'A', 'B', 'C', 'D', 'U']);
  matchdef.Matchdef.prototype.setDivisions.call (this, ['AM Limited', 'AM Open', 'PRO Limited', 'PRO Open']);

  this.addPenalty (this, {name: 'Procedural', value: 3, multiple: true});

  return this;
};

Matchdef.prototype = Object.create (matchdef.Matchdef.prototype);

Matchdef.prototype.getBonuses = function () {
  return this.match_bonuses;
};
Matchdef.prototype.getBonusValueByIndex = function (idx) {
  return (idx >= this.match_bonuses.length) ? null : this.match_bonuses [idx].getValue ();
};
Matchdef.prototype.setBonuses = function (newBonuses) {
  this.match_bonuses = newBonuses;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.addBonus = function (options) {
  options = options || {};

  if (_.isUndefined (options.name) || _.isUndefined (options.value) || _.isUndefined (options.multiple))
    return true;

  this.match_bonuses.push (new bonus.Bonus (options));

  return false;
};
Matchdef.prototype.getDivisions = function () {
  return matchdef.Matchdef.prototype.getDivisions.call (this);
};
Matchdef.prototype.setDivisions = function (newDivisions) {
  return matchdef.Matchdef.prototype.setDivisions.call (this, newDivisions);
};
Matchdef.prototype.getPenalties = function () {
  return this.match_penalties;
};
Matchdef.prototype.getPenaltiesValueByIndex = function (idx) {
  return (idx >= this.match_penalties.length) ? null : this.match_penalties [idx].getValue ();
};
Matchdef.prototype.setPenalties = function (newPenalties) {
  this.match_penalties = newPenalties || [];
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.addPenalty = function (options) {
  options = options || {};

  if (_.isUndefined (options.name) || _.isUndefined (options.value) || _.isUndefined (options.multiple))
    return true;

  this.match_penalties.push (new penalty.Penalty (options));
  this.match_modifieddate = psutils.timeStampUTC ();

  return false;
};
Matchdef.prototype.newShooter = function () {
  return new Shooter (Array.prototype.slice.call (arguments));
};
Matchdef.prototype.newStage = function () {
  return new Stage (Array.prototype.slice.call (arguments));
};

//
//  From Score:
//    aprv  <boolean>
//    dname <string>
//    dnf   <boolean>
//    mod   <string>
//    poph  <integer>
//    popm  <integer>
//    shtr  <string>
//    str   <array:float>
//    udid  <string>
//  Adds:
//    bons  <array:integer>
//    bonss <array:integer>
//    pens  <array:integer>
//    penss <array:integer>
//
var Score = function () {
  score.Score.apply (this, Array.prototype.slice.call (arguments));

  this.bons  = [];
  this.bonss = [];
  this.pens  = [];
  this.penss = [];

  return this;
};

Score.prototype = Object.create (score.Score.prototype);

Score.prototype.getBonuses = function () {
  return this.bons;
};
Score.prototype.setBonuses = function (bonuses) {
  assert (_.isArray (bonuses), "timeplus.Score.setBonuses parameter must be array");
  this.bons = bonuses || [];
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getBonusesString = function () {
  return this.bonss;
};
Score.prototype.setBonusesString = function (bonuses) {
  assert (_.isArray (bonuses), "timeplus.Score.setBonusesString parameter must be array");
  this.bonss = bonuses || [];
  this.mod   = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getPenalties = function () {
  return this.pens;
};
Score.prototype.setPenalties = function (penalties) {
  assert (_.isArray (penalties), "timeplus.Score.setPenalties parameter must be array");
  this.pens = penalties || [];
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getPenaltiesString = function () {
  return this.penss;
};
Score.prototype.setPenaltiesString = function (penalties) {
  assert (_.isArray (penalties), "timeplus.Score.setPenaltiesString parameter must be array");
  this.penss = penalties || [];
  this.mod   = psutils.timeStampUTC ();
  return this;
};
Score.prototype.merge = function (newScore, callback) {
  var self = this;
  var err = null;
  var changes = [];

  score.Score.prototype.merge.call (self, newScore, function (cbErr, scoreChanges) {
    err = cbErr;
    changes = changes.concat (scoreChanges);

    var compare = function (field, callback) {
      if (_.isArray (self [field])) {
        _.each (self [field], function (f, i) {
          if (self [field][i] !== newScore [field][i])
            changes.push (callback (self, newScore, field, i));
        });
      } else if (self [field] !== newScore [field])
        changes.push (callback (self [field], newScore [field]));
    };

    //
    //  The timestamp will cover these fields, even if no other fields (besides
    //  'mod') in the base Score class changed
    //
    if (callback) {
      compare ('bons',  function (ov, nv) {return sprintf ('    Bonuses changed from %s to %s', ov, nv);});
      compare ('bonss', function (ov, nv) {return sprintf ('    Bonus strings changed from %s to %s', ov, nv);});
      compare ('pens',  function (ov, nv) {return sprintf ('    Penalties changed from %s to %s', ov, nv);});
      compare ('penss', function (ov, nv) {return sprintf ('    Penalty strings changed from %s to %s', ov, nv);});
    }

    self.bons  = newScore.bons;
    self.bonss = newScore.bons;
    self.pens  = newScore.pens;
    self.penss = newScore.pens;

    if (callback)
      callback (err, changes);
  });
};

//
//  From StageScores:
//    stage_number      <integer>
//    stage_stagescores <array:Scores>
//    stage_uuid        <string>
//  Adds:
//    (none)
//
var StageScores = function () {
  return stagescores.StageScores.apply (this, Array.prototype.slice.call (arguments));
};

StageScores.prototype = Object.create (stagescores.StageScores.prototype);

StageScores.prototype.newScore = function () {
  return new Score (Array.prototype.slice.call (arguments));
};

//
//  From MatchScores:
//    match_id             <string>
//    match_scores         <array:StageScores>
//    match_scores_history <hash:hash:array>
//  Adds:
//    (none)
//
var MatchScores = function () {
  return matchscores.MatchScores.apply (this, Array.prototype.slice.call (arguments));
};

MatchScores.prototype = Object.create (matchscores.MatchScores.prototype);

MatchScores.prototype.addStage = function (stageScores) {
  matchscores.MatchScores.prototype.addStage.call (this, stageScores || new StageScores (matchscores.MatchScores.prototype.nextStageNumber.call (this)));
  return this;
};
MatchScores.prototype.newStageScores = function () {
  return new StageScores (Array.prototype.slice.call (arguments));
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
