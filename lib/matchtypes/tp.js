'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var async = require ('async');
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var psutils = require ('../utils');
var shooter = require ('../ps_classes/shooter');
var bonus = require ('../ps_classes/bonus');
var penalty = require ('../ps_classes/penalty');
var stage = require ('../ps_classes/stage');
var matchdef = require ('../ps_classes/matchdef');
var score = require ('../ps_classes/score');
var stagescores = require ('../ps_classes/stagescores');
var matchscores = require ('../ps_classes/matchscores');
var matchlog = require ('../ps_classes/matchlog');
// var stagehistory = require ('../ps_classes/stagehistory');
// var matchhistory = require ('../ps_classes/matchhistory');

var lookups = {
  matchlevels: {},
  ages: {
    'JUNIOR': 'Junior',
    'ADULT':  'Adult',
    'SENIOR': 'Senior',
  },
  genders: {
    'FEMALE': 'Female',
    'MALE':   'Male',
  },
  divisions: {},
  divisions_flipped: {},
  classes: {},
  classes_flipped: {},
  categories: [],
};

//
//  enabled: true, readonly: true added when default values are loaded. There
//  are no default penalties or bonuses for time-plus matches.
//
var defaultValues = {
  categories: [
    { ps_name: 'Lady',            pmm_name: 'Lady',            },
    { ps_name: 'Junior',          pmm_name: 'Junior',          exclude: ['Preteen', 'Senior', 'Super Senior'], },
    { ps_name: 'Senior',          pmm_name: 'Senior',          exclude: ['Preteen', 'Junior', 'Super Senior'], },
    { ps_name: 'Law Enforcement', pmm_name: 'Law Enforcement', exclude: ['Military'], },
    { ps_name: 'Military',        pmm_name: 'Military',        exclude: ['Law Enforcement'], },
  ],
  classes: [
    { ps_name: 'X', pmm_name: 'X', },
  ],
  divisions: [
    { ps_name: 'FC',  pmm_name: 'Factory',                  },
    { ps_name: 'HO',  pmm_name: 'Heavy Optics',             },
    { ps_name: 'HS',  pmm_name: 'Heavy Sport',              },
    { ps_name: 'PCO', pmm_name: 'Pistol Caliber Optics',    },
    { ps_name: 'PCI', pmm_name: 'Pistol Caliber Irons',     },
    { ps_name: 'PCU', pmm_name: 'Pistol Caliber Unlimited', },
    { ps_name: 'PR',  pmm_name: 'Practical',                },
    { ps_name: 'UL',  pmm_name: 'Unlimited',                },
  ],
};

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
//  http://tonylukasavage.com/blog/2014/09/24/optional-callbacks-for-flexible-apis-in-javascript/
//
function maybeCallback (callback) {
  return _.isFunction (callback) ? callback : function (err) { throw err; };
}

//
//
//
if (!Number.isInteger) {
  Number.isInteger = function isInteger (nVal) {
    return _.isNumber (nVal) && _.isFinite (nVal) && (nVal > -9007199254740992) && (nVal < 9007199254740992) && (Math.floor (nVal) === nVal);
  };
}

//
//  From Bonus:
//    bon_bin   <boolean>
//    bon_name  <string>
//    bon_value <float>
//  Adds:
//    (none);
//
var Bonus = function () {
  return bonus.Bonus.apply (this, Array.prototype.slice.call (arguments));
};

Bonus.prototype = Object.create (bonus.Bonus.prototype);

//
//  From Penalty:
//    pen_bin   <boolean>
//    pen_name  <string>
//    pen_value <float>
//  Adds:
//    (none);
//
var Penalty = function () {
  return penalty.Penalty.apply (this, Array.prototype.slice.call (arguments));
};

Penalty.prototype = Object.create (penalty.Penalty.prototype);

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
//    sh_st     <string>
//    sh_uid    <string>
//    sh_uuid   <string>
//    sh_wlk    <boolean>
//  Adds:
//    (none)
//
var Shooter = function () {
  var self = this;

  shooter.Shooter.apply (self, Array.prototype.slice.call (arguments));

  shooter.Shooter.prototype.setClass.call (self, 'X');
  shooter.Shooter.prototype.setDivision.call (self, 'UL');

  return self;
};

Shooter.prototype = Object.create (shooter.Shooter.prototype);

//
//  Fixup updates the sh_ctgs field if it's empty (which it can legally be, but
//  if it is, they might have the legacy fields set so we need to check them.
//  If sh_ctgs already set, we know it should be correct.
//
Shooter.prototype.fixup = function (parent, position, options) {
  var self = this;
  var categories = self.getCategories ();

  shooter.Shooter.prototype.fixup.call (self, parent, position, options);

  if (self.sh_id) // FIXME: How do 3GN numbers work?
    self.sh_id = self.sh_id.replace (/[^A-Za-z0-9]/, '').toUpperCase ();

  //
  //  Because 'RFPO' doesn't make much sense to some people, if the divisions
  //  have been renamed to their long name, if the long name exists, then
  //  convert it to the abbreviation. If we can't find it that way, just
  //  force them to open division for now.
  //
  if (!lookups.divisions [self.sh_dvp])
    self.sh_dvp = lookups.divisions_flipped [self.sh_dvp.toUpperCase ()] || 'UL';

  if (!lookups.classes [self.sh_grd])
    self.sh_grd = 'X';

  //
  //  Old files don't have the sh_ctgs array populated, but may have the
  //  discrete fields set (SquadSignup.com for sure doesn't do it right).
  //
  if (_.isEmpty (categories)) {
    switch (self.getAge ()) {
      case 'JUNIOR': self.addCategoryFixup ('Junior'); break;
      case 'SENIOR': self.addCategoryFixup ('Senior'); break;
    }

    if (self.isFemale ())
      self.addCategoryFixup ('Lady');
    if (self.isLaw ())
      self.addCategoryFixup ('Law Enforcement');
    if (self.isMilitary ())
      self.addCategoryFixup ('Military');
    if (self.isForeign ())
      self.addCategoryFixup ('Foreign');
  } else {
    _.some (lookups.ages, function (ageValue, ageKey) {
      if (_.includes (categories, ageValue)) {
        self.setAge (ageKey);
        return true;
      }
      return false;
    });

    if (_.includes (categories, 'Lady'))
      self.setGenderFemale ();
    if (_.includes (categories, 'Military'))
      self.setIsMilitary ();
    if (_.includes (categories, 'Law Enforcement'))
      self.setIsLaw ();
    if (_.includes (categories, 'Foreign'))
      self.setIsForeign ();
  }

  return self;
};
Shooter.prototype.stripBadMembershipNumber = function (callback) {
  var tgnRegex = /^(?:A|B|CA|CAL|CL|F|FL|FY|FYF|L|PEN|RD|S|TY|TYF)[0-9]{1,6}$/;

  return shooter.Shooter.prototype.stripBadMembershipNumber.call (this, tgnRegex, callback);
};

//
//  From Stage:
//    stage_classifier        <boolean>
//    stage_classifiercode    <string>
//    stage_maxstringtime     <float>
//    stage_modifieddate      <string>
//    stage_name              <string>
//    stage_noshoots          <boolean> // Not used in TimePlus
//    stage_number            <integer>
//    stage_poppers           <integer> // Not used in TimePlus
//    stage_scoretype         <string ("TimePlus", ?)>
//    stage_strings           <integer>
//    stage_targets           <array:Target> // Not used in TimePlus
//    stage_uuid              <string>
//  Adds:
//    stage_maxstringtime     <float>
//
var Stage = function () {
  var self = this;

  stage.Stage.apply (self, Array.prototype.slice.call (arguments));

  delete self.stage_noshoots; // FIXME: Remove when stage_noshoots defined in match type
  delete self.stage_poppers;  // FIXME: Remove when stage_poppers defined in match type
  delete self.stage_targets;  // FIXME: Remove when stage_targets defined in match type

  self.setScoringType ('TimePlus');
  self.setMaxStringTime (0);

  return self;
};

Stage.prototype = Object.create (stage.Stage.prototype);

Stage.prototype.setScoringType = function (newScoringType) {
  if (newScoringType !== 'TimePlus')
    throw new ConversionError ('setScoringType parameter must be "TimePlus"');

  stage.Stage.prototype.setScoringType.call (this, newScoringType);

  return this;
};
Stage.prototype.isTimePlus = function () {
  return this.stage_scoretype === 'TimePlus';
};
Stage.prototype.getMaxStringTime = function () {
  return this.stage_maxstringtime;
};
Stage.prototype.setMaxStringTime = function (newMaxStringTime) {
  this.stage_maxstringtime = parseInt (newMaxStringTime || 0);
  this.stage_modifieddate = psutils.timeStampUTC ();
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

  assert (_.isObject (options));
  assert (_.isFunction (callback));
  assert (newStage, 'sc.Stage.prototype.merge(): newStage cannot be null or undefined');

  options = _.merge (options, {onChangeStage: function (left, right, changeList) {
    merge.compare (left, right, 'stage_maxstringtime', function (ov, nv) {changeList.push (sprintf ('    Maximum string time changed from %s to %s', ov, nv));});
  }});

  stage.Stage.prototype.merge.call (self, newStage, options, function (stageErr, stageChanges) {
    err = err || stageErr;
    changes = changes.concat (stageChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Stage.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var s = stage.Stage.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.stage_maxstringtime)
    s.stage_maxstringtime = self.stage_maxstringtime;

  delete s.stage_targets;

  return s;
};
Stage.prototype.parse = function (jsonStage) {
  var self = this;
  var map = {
    stage_maxstringtime:     self.setMaxStringTime,
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

  //
  //  Usually want to call the super class first, but we need it here so that
  //  stage_modifieddate gets set with the value from the match, not what we've
  //  updated it to when we call functions that modify stage_modifieddate.
  //
  stage.Stage.prototype.parse.call (self, jsonStage);

  return self;
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
//    match_maxstagetime           <float>
//    match_subtype                <string>
//    match_usemaxstagetime        <boolean>
//
var Matchdef = function (accessorFunctions, options, callback) {
  var self = this;

  callback = maybeCallback (arguments [arguments.length - 1]);

  if (!options || _.isFunction (options))
    options = {};

  matchdef.Matchdef.call (self, accessorFunctions, options, function (err) {
    if (!err) {
      self.match_bonuses = [];
      self.match_penalties = [];

      self.setMaxStageTime (0);
      self.setUseMaxStageTime (false);
      self.setSubtype ('none');

      matchdef.Matchdef.prototype.setMatchType.call (self, 'timeplus');

      async.parallel ([
        function (callback) {
          matchdef.Matchdef.prototype.loadCategories.call (self, defaultValues.categories, function (err, categories) {
            if (!err)
              lookups.categories = _.pluck (categories, 'ps_name');
            callback (err);
          });
        },
        function (callback) {
          matchdef.Matchdef.prototype.loadClasses.call (self, defaultValues.classes, function (err, classes) {
            if (!err) {
              lookups.classes = {};
              lookups.classes_flipped = {};
              _.each (classes, function (classs) {
                lookups.classes [classs.ps_name] = classs.pmm_name;
                lookups.classes_flipped [classs.pmm_name] = classs.ps_name;
              });
            }
            callback (err);
          });
        },
        function (callback) {
          matchdef.Matchdef.prototype.loadDivisions.call (self, defaultValues.divisions, function (err, divisions) {
            if (!err) {
              lookups.divisions = {};
              lookups.divisions_flipped = {};
              _.each (divisions, function (division) {
                lookups.divisions [division.ps_name] = division.pmm_name;
                lookups.divisions_flipped [division.pmm_name.toUpperCase ()] = division.ps_name;
              });
            }
            callback (err);
          });
        },
      ], function (err) {
        callback (err, self);
      });
    } else
      callback (err, self);
  });

  return self;
};

Matchdef.prototype = Object.create (matchdef.Matchdef.prototype);

Matchdef.prototype.getBonuses = function () {
  return this.match_bonuses || [];
};
Matchdef.prototype.getBonusValueByIndex = function (idx) {
  return (idx >= this.match_bonuses.length) ? null : this.match_bonuses [idx].getValue ();
};
Matchdef.prototype.setBonuses = function (newBonuses) {
  if (!_.isArray (newBonuses))
    throw new TypeError ('setBonuses() argument must be Array');
  this.match_bonuses = newBonuses || [];
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.addBonus = function (newBonus, options) {
  if (newBonus.className () !== 'Bonus')
    throw new TypeError ('Matchdef.addBonus parameter must be Bonus object');

  options = options || {};
  this.match_bonuses.push (newBonus);
  this.match_modifieddate = (options.tsKeep ? this.match_modifieddate : null) || psutils.timeStampUTC ();

  return this;
};
Matchdef.prototype.getPenalties = function () {
  return this.match_penalties || [];
};
Matchdef.prototype.getPenaltiesValueByIndex = function (idx) {
  return (idx >= this.match_penalties.length) ? null : this.match_penalties [idx].getValue ();
};
Matchdef.prototype.setPenalties = function (newPenalties) {
  if (!_.isArray (newPenalties))
    throw new TypeError ('setPenalties() argument must be Array');

  this.match_penalties = newPenalties || [];
  this.match_modifieddate = psutils.timeStampUTC ();

  return this;
};
Matchdef.prototype.addPenalty = function (newPenalty, options) {
  if (newPenalty.className () !== 'Penalty')
    throw new TypeError ('Matchdef.addPenalty parameter must be Penalty object');

  options = options || {};
  this.match_penalties.push (newPenalty);
  this.match_modifieddate = (options.tsKeep ? this.match_modifieddate : null) || psutils.timeStampUTC ();

  return this;
};
Matchdef.prototype.getMaxStageTime = function () {
  return this.match_maxstagetime;
};
Matchdef.prototype.setMaxStageTime = function (newMaxStageTime) {
  this.match_maxstagetime = parseInt (newMaxStageTime || 0);
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getUseMaxStageTime = function () {
  return this.match_usemaxstagetime;
};
Matchdef.prototype.setUseMaxStageTime = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setUseMaxStageTime() argument must be boolean');
  this.match_usemaxstagetime = state;
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
Matchdef.prototype.getSubtype = function () {
  return this.match_subtype;
};
Matchdef.prototype.setSubtype = function (newSubtype) {
  this.match_subtype = newSubtype;
  return this;
};
Matchdef.prototype.newBonus = function () {
  return new Bonus (Array.prototype.slice.call (arguments));
};
Matchdef.prototype.newPenalty = function () {
  return new Penalty (Array.prototype.slice.call (arguments));
};
Matchdef.prototype.newShooter = function () {
  return new Shooter ({sh_pos: this.match_shooters.length + 1});
};
Matchdef.prototype.newStage = function () {
  return new Stage ({stage_number: this.match_stages.length + 1});
};
Matchdef.prototype.setupMaxstagetimes = function () {
  return 90;
};
Matchdef.prototype.setupSubtypes = function () {
  return [
    {value: 'none', label: 'none'},
    {value: '3GN',  label: '3GN' },
  ];
};
Matchdef.prototype.fixup = function (parent, options) {
  var self = this;

  matchdef.Matchdef.prototype.fixup.call (self, parent, options);

  if (_.isEmpty (self.getCategories ()))
    self.setCategories (lookups.categories);

  return self;
};
Matchdef.prototype.merge = function (newMatchdef, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert (_.isObject (options));
  assert (_.isFunction (callback));
  assert (newMatchdef, 'tp.Matchdef.prototype.merge(): newMatchdef cannot be null or undefined');

  //
  //  Ick. self and newMatchdef should be left and right.
  //
  options = _.merge (options, {onChangeMatchdef: function (left, right, changeList) {
    merge.compare (left, right, 'match_subtype',         function (ov, nv) {changeList.push (sprintf ('  Match subtype changed from %s to %s', ov, nv));});
    merge.compare (left, right, 'match_maxstagetime',    function (ov, nv) {changeList.push (sprintf ('  Maximum stage time changed from %s to %s', ov, nv));});
    merge.compare (left, right, 'match_usemaxstagetime', function (ov, nv) {changeList.push (sprintf ('  Use maximum stage time changed from %s to %s', ov, nv));});
    merge.compareArrayOfObjects (self, newMatchdef, 'match_bonuses', function (objectChanges) {
      _.each (objectChanges, function (t) {
        changeList.push (t);
      });
    });
    merge.compareArrayOfObjects (self, newMatchdef, 'match_penalties', function (objectChanges) {
      _.each (objectChanges, function (t) {
        changeList.push (t);
      });
    });
  }});

  matchdef.Matchdef.prototype.merge.call (self, newMatchdef, options, function (matchdefErr, matchdefChanges) {
    err = matchdefErr;
    changes = changes.concat (matchdefChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Matchdef.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var m = matchdef.Matchdef.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.match_bonuses.length) {
    m.match_bonuses = [];

    _.each (self.match_bonuses, function (bonus) {
      m.match_bonuses.push (bonus.getAsPlainObject (options));
    });
  }

  if (notcompact || self.match_maxstagetime)
    m.match_maxstagetime = self.match_maxstagetime;

  if (notcompact || self.match_penalties.length) {
    m.match_penalties = [];

    _.each (self.match_penalties, function (penalty) {
      m.match_penalties.push (penalty.getAsPlainObject (options));
    });
  }

  if (notcompact || self.match_subtype.length)
    m.match_subtype = self.match_subtype;
  if (notcompact || self.match_usemaxstagetime)
    m.match_usemaxstagetime = self.match_usemaxstagetime;

  return m;
};
Matchdef.prototype.parse = function (jsonMatchdef, options) {
  var self = this;
  var map = {
    match_maxstagetime:    self.setMaxStageTime,
    match_usemaxstagetime: self.setUseMaxStageTime,
    match_subtype:         self.setSubtype,
    match_bonuses: function (bonuses) {
      _.each (bonuses, function (bonus) {
        self.addBonus (self.newBonus ().parse (bonus));
      });
    },
    match_penalties: function (penalties) {
      _.each (penalties, function (penalty) {
        self.addPenalty (self.newPenalty ().parse (penalty));
      });
    },
  };

  if (!jsonMatchdef)
    return self;

  options = options || {};

  _.each (jsonMatchdef.match_shooters, function (shooter) {
    self.addShooter (self.newShooter ().parse (shooter));
  });

  _.each (jsonMatchdef.match_stages, function (stage) {
    self.addStage (self.newStage ().parse (stage));
  });

  _.each (_.keys (map), function (key) {
    if (key in jsonMatchdef) {
      map [key].call (self, jsonMatchdef [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  //
  //  Usually want to call the super class first, but we need it here so that
  //  match_modifieddate gets set with the value from the match, not what we've
  //  updated it to when we call functions that modify match_modifieddate.
  //
  matchdef.Matchdef.prototype.parse.call (self, jsonMatchdef, options);

  return self;
};

//
//  From Score:
//    aprv  <boolean>
//    dname <string>
//    dnf   <boolean>
//    mod   <string>
//    poph  <integer> (not used)
//    popm  <integer> (not used)
//    shtr  <string>
//    str   <array:float>
//    udid  <string>
//  Adds:
//    bons  <array:integer>
//    pens  <array:integer>
//
var Score = function () {
  score.Score.apply (this, Array.prototype.slice.call (arguments));

  this.bons  = [];
  this.pens  = [];

  return this;
};

Score.prototype = Object.create (score.Score.prototype);

Score.prototype.getBonuses = function () {
  return this.bons;
};
Score.prototype.setBonuses = function (bonuses) {
  assert (_.isArray (bonuses), "tp.Score.setBonuses parameter must be array");
  this.bons = bonuses || [];
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getPenalties = function () {
  return this.pens;
};
Score.prototype.setPenalties = function (penalties) {
  assert (_.isArray (penalties), "tp.Score.setPenalties parameter must be array");
  this.pens = penalties || [];
  this.mod  = psutils.timeStampUTC ();
  return this;
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

  //
  //  bons and pens are arrays of integers, not Bonus or Penalty objects. Each
  //  value is the *number* of bonuses and penalties, with the position in the
  //  array corresponding to the position in the matchdef.match_bonuses or
  //  matchdef.match_penalties arrays (these are the Bonus and Penalty
  //  objects).
  //
  options = _.merge (options, {onChangeScore: function (left, right, changeList) {
    merge.compareArray (left, right, 'bons', function (ov, nv, index) {changeList.push (sprintf ('    Bonus #%d changed from %s to %s', index, ov.bons [index], nv.bons [index]));});
    merge.compareArray (left, right, 'pens', function (ov, nv, index) {changeList.push (sprintf ('    Penalty #%d changed from %s to %s', index, ov.pens [index], nv.pens [index]));});
  }});

  score.Score.prototype.merge.call (self, newScore, options, function (cbErr, scoreChanges) {
    err = cbErr;
    changes = changes.concat (scoreChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Score.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var s = score.Score.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.bons.length) s.bons = self.bons;
  if (notcompact || self.pens.length) s.pens = self.pens;

  delete s.poph; // FIXME: Remove when poph defined in match type
  delete s.popm; // FIXME: Remove when popm defined in match type
  delete s.ts; // FIXME: Remove when ts defined in match type

  return s;
};
Score.prototype.parse = function (jsonScore) {
  var self = this;
  var map = {
    bons: self.setBonuses,
    pens: self.setPenalties,
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

  //
  //  Usually want to call the super class first, but we need it here so that
  //  mod gets set with the value from the match, not what we've updated it to
  //  when we call functions that modify mod.
  //
  score.Score.prototype.parse.call (self, jsonScore);

  return self;
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
MatchScores.prototype.newHistoryScore = function () {
  return new Score (Array.prototype.slice.call (arguments));
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
var Lookups = function (accessorFunctions, options, callback) {
  callback = maybeCallback (arguments [arguments.length - 1]);
  callback (null, lookups);

  return this;
};

//
//
//
exports.Shooter = Shooter;
exports.Bonus = Bonus;
exports.Penalty = Penalty;
exports.Stage = Stage;
exports.Matchdef = Matchdef;
exports.Score = Score;
exports.StageScores = StageScores;
exports.MatchScores = MatchScores;
exports.MatchLog = MatchLog;
exports.Lookups = Lookups;
