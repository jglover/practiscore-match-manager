'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var async = require ('async');
var cheerio = require ('cheerio');
var fs = require ('fs');
var locks = require ('locks');
var moment = require ('moment');
var request = require ('request');
var sprintf = require ('sprintf-js').sprintf;
var wait = require ('wait.for');
var merge = require ('../merge');
var psutils = require ('../utils');
var shooter = require ('../ps_classes/shooter');
var target = require ('../ps_classes/target');
var stage = require ('../ps_classes/stage');
var matchdef = require ('../ps_classes/matchdef');
var score = require ('../ps_classes/score');
var stagescores = require ('../ps_classes/stagescores');
var matchscores = require ('../ps_classes/matchscores');
var matchlog = require ('../ps_classes/matchlog');
var pmelog = require ('../pmelog');

var lookups = {
  matchlevels: {
     'L1'  : 'Level I',
     'L1s' : 'Level I Special',
     'L2'  : 'Level II',
     'L3'  : 'Level III',
     'N'   : 'Nationals',
  },
  ages: {
    'JUNIOR' : 'Junior',
    'ADULT'  : 'Adult',
    'SENIOR' : 'Senior',
    'SUPSNR' : 'Super Senior',
  },
  ages_export: {
    'JUNIOR' : 'Junior',
    'ADULT'  : '',
    'SENIOR' : 'Senior',
    'SUPSNR' : 'Super Senior',
  },
  divisions_export: {
    'CO'     : 'Carry Optics',
    'LTD'    : 'Limited',
    'LTDTEN' : 'Limited 10',
    'OPEN'   : 'Open',
    'PROD'   : 'Production',
    'REV'    : 'Revolver',
    'SS'     : 'Single Stack',
  },
  powerfactors: {
    'MAJOR' : 'Major',
    'MINOR' : 'Minor',
  },
  genders: {
    'FEMALE' : 'Female',
    'MALE'   : 'Male',
  },
  areaMap: {
    AK:1, ID:1, MT:1, NV:1, OR:1, UT:1, WA:1, WY:1,
    AZ:2, CA:2, CO:2, HI:2, NM:2,
    IA:3, KS:3, MN:3, MO:3, ND:3, NE:3, SD:3,
    AR:4, LA:4, OK:4, TX:4,
    IL:5, IN:5, KY:5, MD:5, MI:5, OH:5, WI:5, WV:5,
    AL:6, FL:6, GA:6, MS:6, NC:6, SC:6, TN:6,
    CT:7, MA:7, ME:7, NH:7, NY:7, RI:7, VT:7,
    DC:8, DE:8, PA:8, NJ:8, VA:8,
  },
  divisions: {},
  divisions_flipped: {},
  classes: {},
  classes_flipped: {},
  categories: [],
};

//
//  enabled: true, readonly: true added when default values are loaded
//
var defaultValues = {
  categories: [
    { ps_name: 'Lady',            pmm_name: 'Lady',            },
    { ps_name: 'Junior',          pmm_name: 'Junior',          exclude: ['Preteen', 'Senior', 'Super Senior'], },
    { ps_name: 'Senior',          pmm_name: 'Senior',          exclude: ['Preteen', 'Junior', 'Super Senior'], },
    { ps_name: 'Super Senior',    pmm_name: 'Super Senior',    exclude: ['Preteen', 'Junior', 'Senior'],       },
    { ps_name: 'Law Enforcement', pmm_name: 'Law Enforcement', exclude: ['Military'], },
    { ps_name: 'Military',        pmm_name: 'Military',        exclude: ['Law Enforcement'], },
    { ps_name: 'Foreign',         pmm_name: 'Foreign',         },
  ],
  classes: [
    { ps_name: 'A', pmm_name: 'A',  },
    { ps_name: 'B', pmm_name: 'B',  },
    { ps_name: 'C', pmm_name: 'C',  },
    { ps_name: 'D', pmm_name: 'D',  },
    { ps_name: 'G', pmm_name: 'GM', },
    { ps_name: 'M', pmm_name: 'M',  },
    { ps_name: 'U', pmm_name: 'U',  },
    { ps_name: 'X', pmm_name: 'X',  },
  ],
  divisions: [
    { ps_name: 'CO',     pmm_name: 'Carry Optics', },
    { ps_name: 'LTD',    pmm_name: 'Limited',      },
    { ps_name: 'LTDTEN', pmm_name: 'Limited 10',   },
    { ps_name: 'OPEN',   pmm_name: 'Open',         },
    { ps_name: 'PROD',   pmm_name: 'Production',   },
    { ps_name: 'REV',    pmm_name: 'Revolver',     },
    { ps_name: 'SS',     pmm_name: 'Single Stack', },
  ],
};

var classificationsUpdateMutex = locks.createMutex ();
var statesUpdateMutex = locks.createMutex ();

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

function validateTargetNumber (targetNumber) {
  if (!Number.isInteger (targetNumber) || (targetNumber < 0) || (targetNumber > 63)) {
    pmelog.llog (pmelog.ERROR, 'targetNumber must be integer between 0 and 64, got %s instead', targetNumber);
    throw new ConversionError ('targetNumber must be integer between 0 and 63');
  }
}

function validateTargetHits (targetHits) {
  if (!Number.isInteger (targetHits) || (targetHits < 0) || (targetHits > 15)) {
    pmelog.llog (pmelog.ERROR, 'targetHits must be integer between 0 and 15, got %s instead', targetHits);
    throw new ConversionError ('targetHits must be integer between 0 and 15');
  }
}

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
//    sh_area   <integer>
//
var Shooter = function () {
  var self = this;

  shooter.Shooter.apply (self, Array.prototype.slice.call (arguments));

  shooter.Shooter.prototype.setClass.call (self, 'U');
  shooter.Shooter.prototype.setDivision.call (self, 'OPEN');
  shooter.Shooter.prototype.setPowerFactorByName.call (self, 'MINOR');
  shooter.Shooter.prototype.setNumber.call (self, -1);

  self.sh_area = 0;

  return self;
};

Shooter.prototype = Object.create (shooter.Shooter.prototype);

Shooter.prototype.getDivisionLong = function () {
  var division = this.getDivision ();
  return lookups.divisions [division] || division;
};
Shooter.prototype.setDivision = function (newDivision) {
  if ((newDivision === 'PROD') || (newDivision === 'CO'))
    this.setPowerFactorByName ('MINOR');

  shooter.Shooter.prototype.setDivision.call (this, newDivision);
  return this;
};
Shooter.prototype.getMembershipNumberParsed = function () {
  var self = this;
  var uspsaNum = /^(A|B|CA|CAL|CL|F|FL|FY|FYF|L|RD|S|TY|TYF)([0-9]{1,6})$/i;
  var parsed = uspsaNum.exec (self.sh_id);

  if (parsed && parsed [1] && parsed [2])
    return {
      prefix: parsed [1],
      number: parsed [2],
    };

  return undefined;
};
Shooter.prototype.getArea = function () {
  return this.sh_area;
};
Shooter.prototype.setArea = function (newArea) {
  this.sh_area = parseInt (newArea) || 0;
  return this;
};
Shooter.prototype.setAreaFromState = function (state) {
  this.sh_area = lookups.areaMap [state] || 0;
  return this;
};
Shooter.prototype.setAreaFromSelf = function () {
  this.sh_area = lookups.areaMap [this.sh_st] || 0;
  return this;
};
Shooter.prototype.setCountryCodeFromSelf = function () {
  this.sh_cc = this.sh_area ? 'USA' : '';
  return this;
};
Shooter.prototype.setState = function (newState) {
  this.sh_st = lookups.areaMap [newState] ? newState : '';
  this.setAreaFromState (newState);
  return this;
};
Shooter.prototype.merge = function (newShooter, options, callback) {
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
  assert (newShooter, 'uspsa.Shooter.prototype.merge(): newShooter cannot be null or undefined');

  options = _.merge (options, {onChangeShooter: function (left, changeList) {
    if (left._fieldChanged.sh_st) {
      var currentArea = self.sh_area;
      var currentCC = self.sh_cc;
      self.setAreaFromSelf ();
      self.setCountryCodeFromSelf ();
      if (!_.isEqual (self.sh_area, currentArea))
        changeList.push (sprintf ('    Area changed from \'%s\' to \'%s\'', currentArea, self.sh_area));
      if (!_.isEqual (self.sh_cc, currentCC))
        changeList.push (sprintf ('    Country code changed from \'%s\' to \'%s\'', currentCC, self.sh_cc));
    }
    if (((left.sh_dvp === 'PROD') || (left.sh_dvp === 'CO')) && (left.sh_pf !== 'MINOR')) {
      self.setPowerFactorByName ('MINOR');
      changeList.push (sprintf ('    Power factor forced to MINOR'));
    }
  }});

  shooter.Shooter.prototype.merge.call (self, newShooter, options, function (shooterErr, shooterChanges) {
    err = shooterErr;
    changes = changes.concat (shooterChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Shooter.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var s = shooter.Shooter.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.sh_area)
    s.sh_area = self.sh_area;

  return s;
};
Shooter.prototype.stripBadMembershipNumber = function (callback) {
  var uspsaRegex = /^(?:A|B|CA|CAL|CL|F|FL|FY|FYF|L|PEN|RD|S|TY|TYF)[0-9]{1,6}$/;

  return shooter.Shooter.prototype.stripBadMembershipNumber.call (this, uspsaRegex, callback);
};

//
//  Fixup updates the sh_ctgs field if it's empty (which it can legally be, but
//  if it is, they might have the legacy fields set so we need to check them.
//  If sh_ctgs already set, we know it should be correct.
//
//  Another case is where sh_ctgs is set, but a corresponding sh_xxx isn't set.
//  For instance, clubs.practiscore.com is setting the age in sh_ctgs, but not
//  setting sh_age.
//
Shooter.prototype.fixup = function (parent, position, options) {
  var self = this;
  var categories = self.getCategories ();

  shooter.Shooter.prototype.fixup.call (self, parent, position, options);

  if (self.sh_id)
    self.sh_id = self.sh_id.replace (/[^A-Za-z0-9]/, '').toUpperCase ();

  //
  //  Because 'REV' doesn't make much sense to some people, if the divisions
  //  have been renamed to their long name, if the long name exists, then
  //  convert it to the abbreviation. If we can't find it that way, just
  //  force them to open division for now.
  //
  if (!lookups.divisions [self.sh_dvp])
    self.sh_dvp = lookups.divisions_flipped [self.sh_dvp.toUpperCase ()] || 'OPEN';

  if ((self.sh_dvp === 'PROD') || (self.sh_dvp === 'CO'))
    self.sh_pf = 'MINOR';

  if (self.sh_grd === 'GM') // FIXME: Hackish! Should check hash for either
    self.sh_grd = 'G';
  if (!lookups.classes [self.sh_grd])
    self.sh_grd = 'U';

  //
  //  If categories are defined for the shooter (sh_ctgs), assume that they're
  //  correct, and we should update the legacy values.
  //
  if (!_.isEmpty (categories)) {
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

  //
  //  If categories (sh_ctgs) was defined, the legacy values are now correct.
  //  If they weren't, then the legacy values will be used to update sh_ctgs.
  //
  switch (self.getAge ()) {
    case 'JUNIOR': self.addCategoryFixup ('Junior'); break;
    case 'SENIOR': self.addCategoryFixup ('Senior'); break;
    case 'SUPSNR': self.addCategoryFixup ('Super Senior'); break;
  }

  if (self.isFemale ())
    self.addCategoryFixup ('Lady');
  if (self.isLaw ())
    self.addCategoryFixup ('Law Enforcement');
  if (self.isMilitary ())
    self.addCategoryFixup ('Military');
  if (self.isForeign ())
    self.addCategoryFixup ('Foreign');

  return self;
};

//
//  From Target:
//    target_deleted  <boolean>
//    target_number   <integer>
//    target_reqshots <integer>
//  Adds:
//    target_maxnpms  <integer>
//
var Target = function () {
  target.Target.apply (this, Array.prototype.slice.call (arguments));

  this.target_maxnpms = 0;

  return this;
};

Target.prototype = Object.create (target.Target.prototype);

Target.prototype.getNPMS = function () {
  return this.target_maxnpms;
};
Target.prototype.setNPMs = function (newNPMs) {
  this.target_maxnpms = parseInt (newNPMs || '0');
  return this;
};
Target.prototype.merge = function (newTarget, options, callback) {
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
  assert (newTarget, 'uspsa.Target.prototype.merge(): newTarget cannot be null or undefined');

  options = _.merge (options, {onChangeTarget: function (left, right, changeList) {
    merge.compare (left, right, 'target_maxnpms', function (ov, nv) {changeList.push (sprintf ('    Maximum NPMs changed from %s to %s', ov, nv));});
  }});

  target.Target.prototype.merge.call (self, newTarget, options, function (targetErr, targetChanges) {
    err = targetErr;
    changes = changes.concat (targetChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Target.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var t = target.Target.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.target_maxnpms)
    t.target_maxnpms = self.target_maxnpms;

  return t;
};
Target.prototype.parse = function (jsonTarget) {
  var self = this;
  var map = {
    target_maxnpms: self.setNPMs,
  };

  if (!jsonTarget)
    return self;

  target.Target.prototype.parse.call (self, jsonTarget);

  _.each (_.keys (map), function (key) {
    if (key in jsonTarget) {
      map [key].call (self, jsonTarget [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  return self;
};

//
//  From Stage:
//    stage_classifier        <boolean>
//    stage_classifiercode    <string>
//    stage_maxstringtime     <float>
//    stage_modifieddate      <string>
//    stage_name              <string>
//    stage_noshoots          <boolean>
//    stage_number            <integer>
//    stage_poppers           <integer>
//    stage_scoretype         <string ("Comstock", "Virgina", "Fixed")>
//    stage_strings           <integer>
//    stage_targets           <array:Target>
//    stage_uuid              <string>
//  Adds:
//    stage_classictargets    <boolean>
//    stage_points            <integer>
//  Overrides:
//    stage_scoretype         <string>
//
//  Also adds stage_points, which is a convenience value for how many stage
//  points the stage is worth. This is only used by the browser Javascript
//  code.
//
var Stage = function () {
  var self = this;

  stage.Stage.apply (self, Array.prototype.slice.call (arguments));

  self.setScoringType ('Comstock');
  self.setTargetTypeMetric ();
  self.updateStagePoints ();

  return self;
};

Stage.prototype = Object.create (stage.Stage.prototype);

Stage.prototype.getTargetType = function () {
  return this.stage_classictargets;
};
Stage.prototype.usesClassicTargets = function () {
  return this.stage_classictargets === true;
};
Stage.prototype.usesMetricTargets = function () {
  return this.stage_classictargets === false;
};
Stage.prototype.setTargetType = function (newType) {
  if (!_.isBoolean (newType))
    throw new ConversionError ('setTargetType parameter must be true (classic targets) or false (IPSC targets)');
  this.stage_classictargets = newType;
  this.stage_modifieddate = psutils.timeStampUTC ();
  return this;
};
Stage.prototype.setTargetTypeClassic = function () {
  return this.setTargetType (true);
};
Stage.prototype.setTargetTypeMetric = function () {
  return this.setTargetType (false);
};
Stage.prototype.setScoringType = function (newScoringType) {
  if ((newScoringType !== 'Comstock') && (newScoringType !== 'Virginia') && (newScoringType !== 'Fixed')) {
    pmelog.llog (pmelog.ERROR, 'setScoringType parameter must be "Comstock", "Virginia", or "Fixed", got "%s"', newScoringType);
    throw new ConversionError ('setScoringType parameter must be "Comstock", "Virginia", or "Fixed"');
  }
  stage.Stage.prototype.setScoringType.call (this, newScoringType);
  return this;
};
Stage.prototype.isComstock = function () {
  return this.stage_scoretype === 'Comstock';
};
Stage.prototype.isVirginiaCount = function () {
  return this.stage_scoretype === 'Virginia';
};
Stage.prototype.isFixedTime = function () {
  return this.stage_scoretype === 'Fixed';
};
Stage.prototype.getStagePoints = function () {
  return this.stage_points;
};
Stage.prototype.setStagePoints = function (stagePoints) {
  this.stage_points = parseInt (stagePoints || 0);
  return this;
};
Stage.prototype.newTarget = function () {
  return new Target (Array.prototype.slice.call (arguments));
};
Stage.prototype.updateStagePoints = function () {
  var self = this;
  var hits;

  hits = self.getPoppers ();

  _.each (self.getTargets (), function (target) {
    if (!target.isDeleted ())
      hits += target.getRequiredHits ();
  });

  self.setStagePoints (hits * 5);

  return self;
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
  assert (newStage, 'uspsa.Stage.prototype.merge(): newStage cannot be null or undefined');

  options = _.merge (options, {onChangeStage: function (left, right, changeList) {
    merge.compare (left, right, 'stage_classictargets', function (ov, nv) {changeList.push (sprintf ('    Classic targets changed from %s to %s', ov, nv));});

    _.each (self.getTargets (), function (target, targetIndex) {
      if (targetIndex < newStage.getTargetCount ())
        target.merge (newStage.getTarget (targetIndex), function (targetErr, targetChanges) {
          err = err || targetErr;
          changes = changes.concat (targetChanges);
        });
    });

    if (self.getTargetCount () > newStage.getTargetCount ()) {
      pmelog.llog (pmelog.WARN, '%s: My stage has %d more targets than new, removing excess targets', options.deviceName, self.getTargetCount () - newStage.getTargetCount ());
      changes.push (sprintf ('    Removed %s target(s)', self.getTargetCount () - newStage.getTargetCount ()));
      self.removeTargets (-1, self.getTargetCount () - newStage.getTargetCount ());
    } else if (self.getTargetCount () < newStage.getTargetCount ()) {
      pmelog.llog (pmelog.WARN, '%s: New stage has %d more targets than mine, adding new targets', options.deviceName, newStage.getTargetCount () - self.getTargetCount ());
      changes.push (sprintf ('    Added %s target(s)', newStage.getTargetCount () - self.getTargetCount ()));
      self.addTargets (newStage.getTargets (self.getTargetCount ()));
    }
  }});

  stage.Stage.prototype.merge.call (self, newStage, options, function (stageErr, stageChanges) {
    err = err || stageErr;
    changes = changes.concat (stageChanges);
  });

  if (callback)
    callback (err, changes);

  return self;
};
Stage.prototype.fixup = function (parent, stage_number, options) {
  var self = this;

  stage.Stage.prototype.fixup.call (self, parent, stage_number, options);

  self.updateStagePoints ();

  return self;
};
Stage.prototype.getAsPlainObject = function (options) {
  var self = this;
  var notcompact = !options || !options.compact;
  var s = stage.Stage.prototype.getAsPlainObject.call (self, options);

  if (notcompact || self.stage_classictargets) s.stage_classictargets = self.stage_classictargets;
  if (notcompact || self.stage_points)         s.stage_points = self.stage_points;

  return s;
};
Stage.prototype.parse = function (jsonStage) {
  var self = this;
  var map = {
    stage_classictargets: self.setTargetType,
    stage_scoretype:      self.setScoringType,
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

  _.each (jsonStage.stage_targets, function (target) {
    self.addTarget (self.newTarget ().parse (target));
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
//    match_level                  <string>
//    match_subtype                <string>
//
var Matchdef = function (accessorFunctions, options, callback) {
  var self = this;

  callback = maybeCallback (arguments [arguments.length - 1]);

  if (!options || _.isFunction (options))
    options = {};

  matchdef.Matchdef.call (self, accessorFunctions, options, function (err) {
    if (!err) {
      self.setLevel ('L1');
      self.setSubtype ('none');

      matchdef.Matchdef.prototype.setMatchType.call (self, 'uspsa_p');

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

Matchdef.prototype.getLevel = function () {
  var self = this;
  var remapLevels = {
    L1:  'Level I',
    L1s: 'Level I Special',
    L2:  'Level II',
    L3:  'Level III',
    N:   'Nationals',
  };

  if (!self.match_level)
    throw new ConversionError ('Match level in database is null or undefined');
  if (!(self.match_level in remapLevels)) {
    pmelog.llog (pmelog.ERROR, 'Unknown match level "%s" in database', self.match_level);
    throw new ConversionError ('Unknown match level "' + self.match_level + '" in database');
  }

  return remapLevels [self.match_level];
};
Matchdef.prototype.setLevel = function (newLevel) {
  var remapLevels = {
    'Level I':         'L1',
    'Level I Special': 'L1s',
    'Level II':        'L2',
    'Level III':       'L3',
    'Nationals':       'N',
    'L1':              'L1',
    'L1s':             'L1s',
    'L2':              'L2',
    'L3':              'L3',
    'N':               'N',
  };

  if (!(newLevel in remapLevels)) {
    pmelog.llog (pmelog.ERROR, 'Match level "%s" not legal match level value', newLevel);
    throw new ConversionError ('Match level "' + newLevel + '" not legal match level value');
  }

  this.match_level = remapLevels [newLevel];
  return this;
};
/*
Matchdef.prototype.getLevel = function () {
  return this.match_level || 'L1';
};
Matchdef.prototype.setLevel = function (newLevel) {
  pmelog.llog (pmelog.DEBUG, 'setLevel w/o remap'); // _DEBUG
  this.match_level = newLevel || 'L1';
  this.match_modifieddate = psutils.timeStampUTC ();
  return this;
};
*/
Matchdef.prototype.getSubtype = function () {
  return this.match_subtype;
};
Matchdef.prototype.setSubtype = function (newSubtype) {
  this.match_subtype = newSubtype ? newSubtype : '';
  return this;
};
Matchdef.prototype.newShooter = function () {
  return new Shooter ({sh_pos: this.match_shooters.length + 1});
};
Matchdef.prototype.newStage = function () {
  return new Stage ({stage_number: this.match_stages.length + 1});
};
Matchdef.prototype.addStage = function (newStage, options) {
  newStage.updateStagePoints ();
  matchdef.Matchdef.prototype.addStage.call (this, newStage, options);
  return this;
};
Matchdef.prototype.setupLevels = function () {
  return [
    {label : 'Level I',   value: 'L1'},
    {label : 'Level II',  value: 'L2'},
    {label : 'Level III', value: 'L3'},
  ];
};
Matchdef.prototype.setupSubtypes = function () {
  return [
    {label: 'none', value: 'none'},
    {label: 'IPSC', value: 'IPSC'}
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
  assert (newMatchdef, 'uspsa.Matchdef.prototype.merge(): newMatchdef cannot be null or undefined');

  options = _.merge (options, {onChangeMatchdef: function (left, right, changeList) {
    merge.compare (left, right, 'match_level',   function (ov, nv) {changeList.push (sprintf ('  Match level changed from %s to %s', ov, nv));});
    merge.compare (left, right, 'match_subtype', function (ov, nv) {changeList.push (sprintf ('  Match subtype changed from %s to %s', ov, nv));});
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

  if (notcompact || (self.match_level && self.match_level.length))
    m.match_level = self.match_level;
  if (notcompact || (self.match_subtype && self.match_subtype.length))
    m.match_subtype = self.match_subtype;

  return m;
};
Matchdef.prototype.parse = function (jsonMatchdef, options) {
  var self = this;
  var map = {
    match_level: self.setLevel,
    match_subtype: self.setSubtype,
  };

  if (!jsonMatchdef)
    return self;

  options = options || {};

  _.each (jsonMatchdef.match_shooters, function (shooter) {
    self.addShooter (self.newShooter ().parse (shooter, options));
  });

  _.each (jsonMatchdef.match_stages, function (stage) {
    self.addStage (self.newStage ().parse (stage, options));
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
Matchdef.prototype.parseClassificationUpdate = function (update) {
  try {
    var record = update.split ('\t'); // USPSA#, expiration, division, classification, first name, last initial, 'USPSA'
    var parsed = record [0].match (/([A-Za-z]+)(\d+)/);
    var prefix = parsed [1];
    var number = parsed [2];
    var unique = /^(A|F|FY|FYF|TY|TYF)$/.test (prefix) ? number : record [0];

    record [1] = record [1].replace (/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');
    record [2] = lookups.divisions_flipped [record [2].toUpperCase ()];
    record [3] = lookups.classes_flipped [record [3].toUpperCase ()];

    return {
      $whole: record [0],
      $prefix: prefix,
      $num: number,
      $unique: unique,
      $expiration: record [1],
      $division: record [2],
      $classification: record [3],
      $first_name: record [4],
      $last_initial: record [5],
      $discipline: record [6],
    };
  } catch (e) {
    pmelog.llog (pmelog.ERROR, e);
    pmelog.llog (pmelog.ERROR, update);
    return undefined;
  }
};
//
//  Return values:
//    -2 - uspsa2 not legal USPSA number
//    -1 - uspsa1 not legal USPSA number
//     0 - numbers are identical (same person)
//     1 - numeric portion matches, prefix is different (same person, new prefix)
//     2 - numbers do not match (not same person, or changed to life)
//
var uspsaNumberCompare = function (uspsa1, uspsa2) {
  var validUSPSA = /^(?:A|B|CA|CAL|CL|F|FL|FY|FYF|L|PEN|RD|S|TY|TYF)[0-9]{1,6}$/i;
  var compareUSPSA = /^(A|F|FY|FYF|TY|TYF)([0-9]{1,6})$/i;
  var r1, r2;

  if (!validUSPSA.test (uspsa1))
    return -1;
  if (!validUSPSA.test (uspsa2))
    return -2;

  if (uspsa1 === uspsa2)
    return 0;

  r1 = compareUSPSA.exec (uspsa1);
  r2 = compareUSPSA.exec (uspsa2);

  if (!r1 || !r2)
    return 2;

  return (r1 [2] === r2 [2]) ? 1 : 2;
};
var uspsaNumberUnique = function (uspsaNum) {
  var parsed = uspsaNum.match (/([A-Za-z]+)(\d+)/);
  var prefix = parsed [1];
  var number = parsed [2];
  var unique = /^(A|F|FY|FYF|TY|TYF)$/.test (prefix) ? number : uspsaNum;

  return unique;
};
var updateClassificationsFetch = function (uspsaNum, webvars, options, wfCallback) {
  pmelog.llog (pmelog.INFO, 'Retrieving %s from USPSA.org', uspsaNum);

  request ({
      url: 'http://www.uspsa.org/uspsa-classifer-lookup-results.php?number=' + uspsaNum,
      headers: webvars.headers,
      jar: webvars.jar,
    },
    function (error, response, body) {
      var update;
      var syntheticUpdates = [];

      if (!error) {
        if (response.statusCode === 200) {
          var $ = cheerio.load (body);

          if (!$(':contains("Member number ' + uspsaNum + ' not found")').length) {
            var name = $('td:contains("Shooter Name:")').next ().text ().trim ().toUpperCase ();
            var uspsaWeb = $('td:contains("Member Number:")').next ().text ().trim ();
            var expiration = moment ($('td:contains("Membership Expiry Date:")').next ().text ().trim (), 'MM/DD/YY').format ('MM/DD/YYYY');
            var compare = uspsaNumberCompare (uspsaNum, uspsaWeb);

            if (compare >= 0) {
              if (compare === 2) {
                var usTermPrefixes = /^(A|FY|TY)/i;
                var usLifePrefixes = /^(L)/i;
                var nonusTermPrefixes = /^(F|FYF|TYF)/i;
                var nonusLifePrefixes = /^(FL)/i;

                if (usTermPrefixes.test (uspsaNum) && usLifePrefixes.test (uspsaWeb))
                  compare = 1;
                else if (nonusTermPrefixes.test (uspsaNum) && nonusLifePrefixes.test (uspsaWeb))
                  compare = 1;
              }

              if (compare !== 2) {
                if (expiration.length) {
                  var names = [];

                  if (options.loggedin) {
                    if (0) {
                      var firstName = $('#firstname').text ().trim ().toUpperCase ();
                      var lastName = $('#lastname').text ().trim ().toUpperCase ();

                      if (!firstName.length || !lastName.length) {
                        options.weirdName = true;
                        pmelog.llog (pmelog.ERROR, 'Shooter name \'%s\' for %s from USPSA.org is weird!', name, uspsaNum);
                      }
                    } else {
                      var n = name.split (' ');

                      if ((n.length === 1) || (n.length >= 5)) {
                        options.weirdName = true;
                        pmelog.llog (pmelog.ERROR, 'Shooter name \'%s\' for %s from USPSA.org is weird!', name, uspsaNum);
                      } else {
                        var suffixes = /^(JR|JNR|JUNIOR|SR|SNR|SENIOR|ST|II|III|IV)$/i;

                        if (suffixes.test (_.last (n).replace (/[^A-Z]/i, ''))) {
                          pmelog.llog (pmelog.INFO, '  Dropped suffix %s on %s', _.last (n), name);
                          n.pop ();
                        }

                        names [2] = n.pop ();
                        names [1] = n.join (' ');
                      }
                    }
                  } else {
                    names = name.match (/(.*) ([A-Z])$/); // last initial only when not logged in

                    if (!names || names.length !== 3) {
                      options.weirdName = true;
                      pmelog.llog (pmelog.ERROR, 'Shooter name \'%s\' for %s from USPSA.org is weird!', name, uspsaNum);
                    }
                  }

                  if (!options.weirdName) {
                    update = {
                      classes: {
                        LTD:    $('td:contains("LIMITED")').next ().text ().replace (/.* (A|B|C|D|M|GM|U|X)$/, '$1').replace (/X/, 'U'),
                        LTDTEN: $('td:contains("LIMITED10")').next ().text ().replace (/.* (A|B|C|D|M|GM|U|X)$/, '$1').replace (/X/, 'U'),
                        OPEN:   $('td:contains("OPEN")').next ().text ().replace (/.* (A|B|C|D|M|GM|U|X)$/, '$1').replace (/X/, 'U'),
                        PROD:   $('td:contains("PRODUCTION")').next ().text ().replace (/.* (A|B|C|D|M|GM|U|X)$/, '$1').replace (/X/, 'U'),
                        REV:    $('td:contains("REVOLVER")').next ().text ().replace (/.* (A|B|C|D|M|GM|U|X)$/, '$1').replace (/X/, 'U'),
                        SS:     $('td:contains("SINGLESTACK")').next ().text ().replace (/.* (A|B|C|D|M|GM|U|X)$/, '$1').replace (/X/, 'U'),
                        CO:     $('td:contains("CARRYOPTICS")').next ().text ().replace (/.* (A|B|C|D|M|GM|U|X)$/, '$1').replace (/X/, 'U'),
                      },
                      firstName: names [1],
                      lastName: names [2],
                      name: name,
                      uspsaNum: (compare === 1) ? uspsaWeb : uspsaNum,
                      expiration: moment (expiration, 'MM/DD/YYYY').format ('YYYY-MM-DD'),
                      web: true,
                    };

                    _.each ([['Limited', 'LTD'], ['Limited 10','LTDTEN'], ['Open','OPEN'], ['Production','PROD'], ['Revolver','REV'], ['Single Stack','SS'], ['Carry Optics','CO']], function (div) {
                      syntheticUpdates.push ([uspsaWeb, expiration, div [0], update.classes [div [1]], names [1], names [2], 'USPSA'].join ('\t'));
                    });
                  }
                } else
                  pmelog.llog (pmelog.INFO, '  Expiration data not found in web page for %s', uspsaNum);
              } else
                pmelog.llog (pmelog.ERROR, '  Info requested for %s returned info for %s', uspsaNum, uspsaWeb);
            } else
              pmelog.llog (pmelog.ERROR, '  One of these two USPSA numbers is invalid: %s, %s', uspsaNum, uspsaWeb);
          } else
            pmelog.llog (pmelog.INFO, '  Got invalid membership number for %s', uspsaNum);
        } else
          pmelog.llog (pmelog.ERROR, '  request() returned HTTP status %s', response.statusCode);
      } else
        pmelog.llog (pmelog.ERROR, '  request() returned error %s', error);

      wfCallback (null, {
        error: error,
        update: update,
        syntheticUpdates: syntheticUpdates,
      });
    });
};
var updateClassificationsShooters = function (shooters, classificationRecords, options, webvars, callback) {
  var changes = [];
  var syntheticUpdates = [];

  _.each (shooters, function (shooter) {
    var validRegex = /^(?:A|B|CA|CAL|CL|F|FL|FY|FYF|L|PEN|RD|S|TY|TYF)[0-9]{1,6}$/;
    var pendingRegex = /^PEN/i;
    var uspsaNum = shooter.getMembershipNumber ();
    var division = shooter.getDivision ();
    var update = {uspsaNum: uspsaNum};

    var pushChange = function (options) {
      var change = {
        sh_uid: shooter.getID (),
        name: shooter.getFullNameLastFirst (),
        email: shooter.getEmail (),
        uspsaNum: shooter.getMembershipNumber (),
        uspsaNumChanged: false,
        division: lookups.divisions [division],
        oldClass: shooter.getClass (),
        newClass: shooter.getClass (),
        classChanged: false,
        note: options.note,
        lognote: options.lognote || options.note,
        expired: options.expired || false,
        unclassified: options.unclassified || false,
        notFound: options.notFound || false,
        invalid: options.invalid || false,
      };

      if (options.newClass && (options.newClass !== shooter.getClass ())) {
        shooter.setClass (options.newClass);
        change.newClass = options.newClass;
        change.classChanged = true;
      }
      if (options.uspsaNum && (options.uspsaNum !== shooter.getMembershipNumber ())) {
        shooter.setMembershipNumber (options.uspsaNum);
        change.uspsaNum = options.uspsaNum;
        change.uspsaNumChanged = true;
      }

      changes.push (change);
    };

    if (!uspsaNum) {
      pushChange ({
        newClass: 'U',
        note: 'No USPSA#',
      });
    } else if (pendingRegex.test (uspsaNum)) {
      pushChange ({
        newClass: 'U',
        invalid: true,
        note: 'Ignored, treated same as no USPSA#',
      });
    } else if (!validRegex.test (uspsaNum)) {
      pushChange ({
        newClass: 'U',
        invalid: true,
        note: 'Invalid USPSA#',
      });
    } else {
      if (!(update = classificationRecords [uspsaNum]))
        if ((update = _.find (classificationRecords, {unique: uspsaNumberUnique (uspsaNum)})))
          update = classificationRecords [update.uspsaNum];

      if (!update && options.verify) {
        var tmp;
        callback (null, {status: 'Retrieving ' + uspsaNum + ' from USPSA.org'});

        tmp = wait.for (updateClassificationsFetch, uspsaNum, webvars, options);

        if (tmp.error)
          callback (null, {status: tmp.error});
        else {
          update = tmp.update;

          if ((tmp.syntheticUpdates.length))
            syntheticUpdates = syntheticUpdates.concat (tmp.syntheticUpdates);
        }
      }

      if (!update)
        pushChange ({newClass: 'U', note: 'USPSA# or division not found', notFound: true});
      else {
        var expired = false;

        if (update.uspsaNum !== uspsaNum)
          pushChange ({
            uspsaNum: update.uspsaNum,
            note: sprintf ('USPSA# changed from %s', uspsaNum),
            lognote: sprintf ('USPSA# changed from %s to %s', uspsaNum, update.uspsaNum),
          });

        if (update.lastName.toUpperCase () !== shooter.getLastName ().toUpperCase ().substring (0, update.lastName.length))
          pushChange ({
            nameMismatch: {lastName: update.lastName, firstName: update.firstName},
            note: sprintf ('Last names don\'t match (USPSA.org says this is %s)', update.lastName),
            lognote: sprintf ('Last names don\'t match (match=%s, USPSA.org=%s)', shooter.getLastName (), update.lastName),
          });

        if ((expired = moment (update.expiration, 'YYYY-MM-DD').diff (moment ().utc ().format ('YYYY-MM-DD'), 'days') < 0))
          pushChange ({
            newClass: (update.classes [division] === 'X') ? 'U' : (shooter.getClass () !== update.classes [division]) ? update.classes [division] : null,
            expired: true,
            note: sprintf ('Membership expired on %s', update.expiration),
          });

        if (!expired && (!update.classes [division] || update.classes [division] === 'U')) {
          pushChange ({
            newClass: 'U',
            unclassified: true,
            note: 'No classification for division',
            lognote: sprintf ('No classification for %s division (%s)', lookups.divisions [division], !update.classes [division] ? 'not in file' : 'is U'),
          });
        }

        if (update.classes [division] && (update.classes [division] !== 'X') && (shooter.getClass () !== update.classes [division]))
          pushChange ({
            newClass: update.classes [division],
            note: 'Class changed',
            lognote: sprintf ('Class changed from %s to %s', shooter.getClass (), update.classes [division]),
          });
      }
    }
  });

  return {
    changes: changes,
    syntheticUpdates: syntheticUpdates,
  };
};
Matchdef.prototype.updateClassifications = function (getter, options, callback) {
  var self = this;
  var webvars = {
    jar: request.jar (),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
    },
  };

  var httpErr = function (error, statusCode) {
    callback (error, {status: (error || ('HTTP status ' + statusCode))});
    pmelog.llog (pmelog.INFO, 'error=%s, statusCode=%s', error, statusCode);
    classificationsUpdateMutex.unlock ();
  };

  var login = function (loginCallback) {
    pmelog.llog (pmelog.INFO, 'Logging into USPSA.org with USPSA number %s', options.uspsanum);
    callback (null, {status: 'Logging into USPSA.org...'});

    request.post ({
        followAllRedirects: true,
        url: 'https://www.uspsa.org/login.php',
        headers: webvars.headers,
        jar: webvars.jar,
        form: {
          action: 'login',
          uspsa: options.uspsanum,
          pw: options.uspsapw,
          pp: '1',
          dest: '',
          submitx: 'Login',
        },
      }, function (error, response, body) {
        if (!error && (response.statusCode === 200))
          loginCallback (null, body);
        else {
          httpErr (error, response.statusCode);
          loginCallback (true, body);
        }
    });
  };

  var loginAttempt = function (loginAttemptCallback) {
    login (function (err, body) {
      if (!err) {
        if (/(does not exist|password is invalid|invalid password)/i.test (body)) {
          callback (null, {msg: '<span style="color: red;">Invalid USPSA number and/or password. Try again, please.</span>'});
          classificationsUpdateMutex.unlock ();
          loginAttemptCallback ('badlogin');
        } else if (/you must have cookies enabled/i.test (body))
          loginAttemptCallback ('cookie');
        else
          loginAttemptCallback ('ok');
      } else
        loginAttemptCallback (err);
    });
  };

  var updateClassificationsEx = function (loggedIn) {
    options.loggedin = loggedIn;

    getter.call (self, 'uspsa', function (err, records) {
      if (err) {
        classificationsUpdateMutex.unlock ();
        callback (err);
      } else if (!records || !records.length) {
        classificationsUpdateMutex.unlock ();
        callback (null, {status: 'No classification update records available'});
      } else {
        var classificationRecords = {};

        _.each (records, function (record) {
          classificationRecords [record.uspsa_whole] = classificationRecords [record.uspsa_whole] || {classes: {}};
          classificationRecords [record.uspsa_whole].expiration = record.expiration;
          classificationRecords [record.uspsa_whole].classes [record.division] = record.classification;
          classificationRecords [record.uspsa_whole].unique = record.uspsa_unique;
          classificationRecords [record.uspsa_whole].uspsaNum = record.uspsa_whole;
          classificationRecords [record.uspsa_whole].firstName = record.first_name;
          classificationRecords [record.uspsa_whole].lastName = record.last_initial;
        });

        wait.launchFiber (function () {
          var tmp = updateClassificationsShooters (self.getShooters (), classificationRecords, options, webvars, callback);

          classificationsUpdateMutex.unlock ();

          _.each (tmp.changes, function (change) {
            pmelog.llog (pmelog.INFO, '%s (%s)', change.uspsaNum, change.name);
            pmelog.llog (pmelog.INFO, '  %s', change.lognote);
          });

          callback (null, {
            modified: tmp.changes.length,
            changes: _.sortBy (tmp.changes, 'name'),
            syntheticUpdates: tmp.syntheticUpdates,
          });
        });
      }
    });
  };

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (!classificationsUpdateMutex.tryLock ())
    callback (null, {status: 'Classification update already in progess'});
  else {
    if (options.verify && options.uspsanum && options.uspsanum.length && options.uspsapw && options.uspsapw.length) {
      loginAttempt (function (result) {
        if (result === 'ok')
          updateClassificationsEx (true);
        else if (result === 'badlogin')
          pmelog.llog (pmelog.ERROR, 'USPSA number or password incorrect, can\'t login to uspsa.org');
        else if (result === 'cookie') {
          loginAttempt (function (result) {
            if (result === 'ok')
              updateClassificationsEx (true);
            else if (result === 'badlogin')
              pmelog.llog (pmelog.ERROR, 'USPSA number or password incorrect, can\'t login to uspsa.org');
            else
              pmelog.llog (pmelog.ERROR, 'Logging in returned error \'%s\' (2nd attempt)', result);
          });
        } else
          pmelog.llog (pmelog.ERROR, 'Logging in returned error \'%s\' (1st attempt)', result);
      });
    } else
      updateClassificationsEx (false);
  }

  return self;
};
Matchdef.prototype.resetClassifications = function (callback) {
  _.each (this.getShooters (), function (shooter) {
    shooter.setClass ('U');
  });

  if (callback)
    callback (null);

  return this;
};
Matchdef.prototype.appendClassifications = function (setter, records, callback) {
  setter.call (this, 'uspsa', records, function (err) {
    callback (err);
  });

  return this;
};
var updateStatesFetch = function (uspsaNum, wfCallback) {
  pmelog.llog (pmelog.INFO, 'Retrieving %s from USPSA.org', uspsaNum);

  request ('http://www.uspsa.org/uspsa-classifer-lookup-results.php?number=' + uspsaNum,
    function (error, response, body) {
      var update;

      if (!error) {
        if (response.statusCode === 200) {
          var $ = cheerio.load (body);

          if (!$(':contains("Member number ' + uspsaNum + ' not found")').length) {
            var name = $('td:contains("Shooter Name:")').next ().text ().trim ().toUpperCase ();
            var stateAreaText = $('td:contains("State")').next ().text ().trim ().toUpperCase ();
            var uspsaWeb = $('td:contains("Member Number:")').next ().text ().trim ();
            var compare = uspsaNumberCompare (uspsaNum, uspsaWeb);

            if (compare >= 0) {
              if (compare !== 2) {
                var names = name.match (/(.*) ([A-Z])$/);
                var state = stateAreaText.match (/^([A-Za-z]{2})/);
                var area = stateAreaText.match (/(\d)$/);

                if (!names || names.length !== 3)
                  pmelog.llog (pmelog.ERROR, 'Shooter name \'%s\' for %s from USPSA.org is weird!', name, uspsaNum);
                else {
                  update = {
                    state: state ? state [1] : '',
                    area: area ? parseInt (area [1] || 0) : -1,
                    uspsaNum: (compare === 1) ? uspsaWeb : uspsaNum,
                    web: true,
                  };
                }
              } else
                pmelog.llog (pmelog.ERROR, '  Info requested for %s returned info for %s', uspsaNum, uspsaWeb);
            } else
              pmelog.llog (pmelog.ERROR, '  One of these two USPSA numbers is invalid: %s, %s', uspsaNum, uspsaWeb);
          } else
            pmelog.llog (pmelog.INFO, '  Got invalid membership number for %s', uspsaNum);
        } else
          pmelog.llog (pmelog.ERROR, '  request() returned HTTP status %s', response.statusCode);
      } else
        pmelog.llog (pmelog.ERROR, '  request() returned error %s', error);

      wfCallback (null, {
        error: error,
        update: update,
      });
    });
};
var updateStatesShooters = function (shooters, options, callback) {
  var nonForeignChanges = [];
  var foreignChanges = [];
  _.each (shooters, function (shooter) {
    var validRegex = /^(?:A|B|CA|CAL|CL|F|FL|FY|FYF|L|PEN|RD|S|TY|TYF)[0-9]{1,6}$/;
    var pendingRegex = /^PEN/i;
    var uspsaNum = shooter.getMembershipNumber ();

    var pushChange = function (list, options) {
      var change = {
        sh_uid: shooter.getID (),
        name: shooter.getFullNameLastFirst (),
        uspsaNum: shooter.getMembershipNumber (),
        lognotes: options.lognotes,
      };

      list.push (change);
    };

    if ((options.skipstateset && shooter.getState ().length) || (options.skipforeignset && shooter.isForeign ()))
      uspsaNum = null;

    if (uspsaNum && !pendingRegex.test (uspsaNum) && validRegex.test (uspsaNum)) {
      var tmp;

      callback (null, {status: 'Retrieving ' + uspsaNum + ' from USPSA.org'});

      tmp = wait.for (updateStatesFetch, uspsaNum);

      if (tmp.error)
        callback (null, {status: tmp.error});
      else {
        var update = tmp.update;
        var lognotes = [];
        var forcedForeign = false;

        if (update.area !== shooter.getArea ())
        {
          if (update.area === -1) {
            shooter.setIsForeign ();
            shooter.setState ('');
            update.area = 0;
            update.state = '';
            forcedForeign = true;
            lognotes.push (sprintf ('Foreign status forced to \'true\''));
          }

          if (update.area !== shooter.getArea ()) {
            var areaBeforeUpdate = shooter.getArea ();
            shooter.setArea (update.area);
            lognotes.push (sprintf ('Area changed from \'%s\' to \'%s\'', areaBeforeUpdate, shooter.getArea ()));
          }
        }

        if (update.state !== shooter.getState ()) {
          var stateBeforeUpdate = shooter.getState ();
          shooter.setState (update.state);
          lognotes.push (sprintf ('State changed from \'%s\' to \'%s\'', stateBeforeUpdate, shooter.getState ()));
        }

        if (lognotes.length)
          pushChange (forcedForeign ? foreignChanges : nonForeignChanges, {lognotes: lognotes});
      }
    }
  });

  return {
    changes: nonForeignChanges.concat (foreignChanges),
  };
};
Matchdef.prototype.updateStates = function (options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (!statesUpdateMutex.tryLock ())
    callback (null, {msg: 'State update already in progess'});
  else {
    wait.launchFiber (function () {
      var tmp = updateStatesShooters (self.getShootersSortedByName (), options, callback);

      statesUpdateMutex.unlock ();

      _.each (tmp.changes, function (change) {
        pmelog.llog (pmelog.INFO, '%s (%s)', change.uspsaNum, change.name);

        _.each (change.lognotes, function (lognote) {
          pmelog.llog (pmelog.INFO, '  %s', lognote);
        });
      });

      callback (null, {
        modified: tmp.changes.length,
        msg: sprintf ("States updated for %s competitors", tmp.changes.length),
      });
    });
  }

  return self;
};
Matchdef.prototype.validateShooter = function (shooter, callback) {
  var self = this;
  var errorList = [];
  var uspsaFields = {
    'sh_id': function (value, errCallback) {
               var validUSPSA = /^(?:A|B|CA|CAL|CL|F|FL|FY|FYF|L|PEN|RD|S|TY|TYF)[0-9]{1,6}$/;

               if (!validUSPSA.test (value))
                 errCallback ('USPSA# is not valid: ' + value);
             },
  };

  matchdef.Matchdef.prototype.validateShooter.call (self, shooter, function (errmsg) { errorList.push (errmsg); });

  _.each (uspsaFields, function (func, field) {
    if (!_.isUndefined (shooter [field])) {
      func (shooter [field], function (errmsg) {
        errorList.push (errmsg);
      });
    }
  });

  if (callback)
    callback (errorList.length, errorList);

  return self;
};
Matchdef.prototype.exportCombined = function () {
  var self = this;
  var lines = [];

  lines.push (['Number','USPSA','First Name','Last Name','Address 1','Address 2','City','State','ZIP Code','Country','Phone','Foreign','Email','Handgun Div','Female','Military','Law','Age','Deleted','Handgun PF','Rifle PF','Shotgun PF','Rifle Entered','Shotgun Entered','Rifle Div','Shotgun Div','Aggregated','Aggregated Div','Squad','Team'].join ('\t'));

  _.each (this.getShooters (), function (shooter) {
    var line = [];

    line.push (shooter.getNumber ());
    line.push (shooter.getMembershipNumber ());
    line.push (shooter.getFirstName ());
    line.push (shooter.getLastName ());
    line.push (shooter.getAddr1 ());
    line.push (shooter.getAddr2 ());
    line.push (shooter.getCity ());
    line.push (shooter.getState ());
    line.push (shooter.getZipcode ());
    line.push (shooter.getCountryCode ());
    line.push (shooter.getPhone ());
    line.push (shooter.isForeign ()  ? 'YES' : 'NO');
    line.push (shooter.getEmail ());
    line.push (lookups.divisions_export [shooter.getDivision ()]);
    line.push (shooter.isFemale ()   ? 'YES' : 'NO');
    line.push (shooter.isMilitary () ? 'YES' : 'NO');
    line.push (shooter.isLaw ()      ? 'YES' : 'NO');
    line.push (lookups.ages_export [shooter.getAge ()]);
    line.push (shooter.isDeleted ()  ? 'YES' : 'NO');
    line.push (lookups.powerfactors [shooter.getPowerFactor ()]);
    line.push ('');     // Rifle PF
    line.push ('');     // Shotgun PF
    line.push ('');     // Rifle Entered
    line.push ('NO');   // Shotgun Entered
    line.push ('');     // Rifle Div
    line.push ('');     // Shotgun Div
    line.push ('NO');   // Aggregated
    line.push ('');     // Aggregated Div
    line.push (shooter.getSquad ());
    line.push (0);      // Team
    lines.push (line.join ('\t'));

    line.push (lookups.classes [shooter.getClass ()]);
  });

  fs.writeFileSync ('./matches/registration.txt', lines.join ('\n') + '\n');

  //
  //
  //
  lines = [];
  lines.push ('9999,START,START,A,0,9998');

  _.each (self.getShooters (), function (shooter) {
    var uspsaNo = shooter.getMembershipNumberParsed () || {prefix: '', number: ''};
    lines.push (sprintf ('"%s","%s","%s","%s","%s","%s"', shooter.getNumber (), shooter.getFirstName (), shooter.getLastName (), uspsaNo.prefix, uspsaNo.number, shooter.getSquad ()));
  });

  lines.push ('9999,END,END,A,0,9998');

  fs.writeFileSync ('./matches/squads.txt', lines.join ('\n') + '\n');

  //
  //
  //
  lines = [];
  lines.push (['Stage Num','Name','Steel','Disappearing','Paper','ShtsPrTrgt','ID','Type','XType','Active','SteelType','PaperType','Time','MaxPoints','Strings'].join ('\t'));

  _.each (_.filter (self.getStages (), 'stage_deleted', false), function (stage, stageIndex) {
    var line = [];
    var stageType = stage.isVirginiaCount () ? 1 : stage.isComstock () ? 2 : stage.isFixedTime () ? 3 : 2;

    line.push (stageIndex + 1);
    line.push (stage.getName ().substr (0, 20));
    line.push (stage.getPoppers ());
    line.push (0);                      // Disappearing (not used in hit factor scoring)
    line.push (stage.getTargetCount ());
    line.push (0);                      // ShtsPrTrgt (not used in hit factor scoring)
    line.push (1234);                   // ID
    line.push (stageType);
    line.push (0);                      // XType (not used in hit factor scoring)
    line.push (1);                      // Active
    line.push (0);                      // SteelType (not used in hit factor scoring)
    line.push (0);                      // PaperType (doesn't do anything)
    line.push ('0.00');                 // Time (not used in hit factor scoring)
    line.push (stage.getStagePoints ());
    line.push (stage.getStrings ());

    lines.push (line.join ('\t'));
  });

  fs.writeFileSync ('./matches/stages_p.txt', lines.join ('\n') + '\n');

  //
  //
  //
  lines = [];
  lines.push (['Stage Number','Stage Name','Classifier'].join ('\t'));

  _.each (_.filter (self.getStages (), 'stage_deleted', false), function (stage, stageIndex) {
    var line = [];

    line.push (stageIndex + 1);
    line.push (stage.getName ().substr (0, 20));
    line.push (stage.isClassifier () ? 'Yes' : 'No');

    lines.push (line.join ('\t'));
  });

  fs.writeFileSync ('./matches/stages_extra_p.txt', lines.join ('\n') + '\n');

  return self;
};

//
//  Calculates the hf, total points, penalities, etc for a single score.
//
var calculateScore = function (stage, score, shooter) {
  var bcPoints = 3;
  var dPoints = 1;
  var cs = {
    shooter: null, div: null, pf: 0,
    del: false, dq: false, dnf: false,
    t: 0.0, t2: 0.00, pts: 0, cp: 0,
    fp: 0, hf: 0.0, hf4: 0.0000,
    a: 0, b: 0, c: 0, d: 0, m: 0, ns: 0, npm: 0, sh: 0, sm: 0, st: 0,
    p: 0, ap: 0,
    tp: 0, sp: 0, pp: 0, mp: 0, smp: 0, nsp: 0,
    spct_o: 0, spts_o: 0, spct_d: 0, spts_d: 0,
    dp: 0, dpo: 0, op: 0, opo: 0,
  };

  if (!shooter)
    return cs;

  if (shooter.isPowerFactorMajor ()) {
    bcPoints = 4;
    dPoints = 2;
    cs.pf = 1;
  }

  cs.shooter = shooter;
  cs.shooterID = shooter.getID ();
  cs.div = shooter.getDivision ();

  if (shooter.isDeleted ()) {
    cs.del = true;
    return cs;
  }

  if (shooter.isDQ ()) {
    cs.dq = true;
    return cs;
  }

  if (score.isDNF ()) {
    cs.dnf = true;
    return cs;
  }

  cs.t = score.getStringTimesTotal ();
  // if (score.str && score.str.length)
  //   cs.t = _.reduce (score.getStringTimes (), function (m, v) { return m + v; });

  cs.a = 0;
  cs.b = 0;
  cs.c = 0;
  cs.d = 0;
  cs.m = 0;
  cs.ns = 0;
  cs.npm = 0;
  cs.sh = score.getPopperHits ();
  cs.sm = score.getPopperMisses ();
  cs.st = cs.sh + cs.sm;
  cs.p = score.getProcedurals ();
  cs.ap = score.getAdditionalPenalties ();

  _.each (score.getTargetScores (), function (hits) {
    cs.a   += ((hits >>  0) & 0x0f);
    cs.b   += ((hits >>  4) & 0x0f);
    cs.c   += ((hits >>  8) & 0x0f);
    cs.d   += ((hits >> 12) & 0x0f);
    cs.ns  += ((hits >> 16) & 0x0f);
    cs.m   += ((hits >> 20) & 0x0f);
    cs.npm += ((hits >> 24) & 0x0f);
  });

  cs.tp = (cs.a * 5) + (cs.b * bcPoints) + (cs.c * bcPoints) + (cs.d * dPoints);
  cs.sp = (cs.sh * 5);
  cs.pts = cs.sp + cs.tp;

  cs.pp = (cs.p * 10) + cs.ap;
  cs.mp = cs.m * 10;
  cs.smp = cs.sm * 10;
  cs.nsp = cs.ns * 10;
  cs.cp = cs.pp + cs.smp + cs.mp + cs.nsp;

  cs.fp = _.max ([cs.pts - cs.cp, 0]);
  cs.hf = (stage.isFixedTime ()) ? cs.fp : (cs.t ? (cs.fp / cs.t) : 0);

  cs.t2 = cs.t.toFixed (2);
  cs.hf4 = cs.hf.toFixed (4);

  return cs;
};

var sortScoresByHF = function (scores) {
  return _.sortBy (scores, function (score) {
    if (score.del)
      return -4.0;
    if (score.dq)
      return -3.0;
    if (score.dnf)
      return -2.0;
    if ((score.t === 0.0) && (score.hf === 0.0))
      return -1.0;

    return score.hf;
  })
  .reverse ();
};

var sortScoresByPoints = function (scores, field, division) {
  return _.sortBy ((division) ? _.filter (scores, 'div', division) : scores, function (score) {
    if (score.del)
      return -4.0;
    if (score.dq)
      return -3.0;
    if (score.dnf)
      return -2.0;

    return score [field];
  })
  .reverse ();
};

/*
scores: {
  bystage: {
    <stage_uuid>: {
      name: <string; stage name>
      cmxx: <string; classifier number>
      scores: {
        <shooter_uuid>: {
          shooter: <Shooter; shooter record>
          div:     <string;  division name>
          pf:      <integer; 0=minor, 1=major>
          del:     <boolean; deleted from match>
          dq:      <boolean; DQed>
          dnf:     <boolean; did-not-fire>
          t:       <float;   time (all strings combined)>
          t2:      <string;  time formatted to two places>
          pts:     <integer; paper + steel points>
          cp:      <integer; combined penalty points (procedural points + steel miss points + miss points + no-shoot points)>
          fp:      <integer; final points (pts - cp)>
          hf:      <float;   hit factor>
          hf4:     <string;  hit factor to 4 places>
          a:       <integer; number of A hits>
          b:       <integer; number of B hits>
          c:       <integer; number of C hits>
          d:       <integer; number of D hits>
          m:       <integer; number of misses hits>
          ns:      <integer; number of no-shoot hits>
          npm:     <integer; number of non-penalty misses>
          sh:      <integer; steel hits>
          sm:      <integer; steel misses>
          st:      <integer; steel hits + steel misses>
          p:       <integer; number of penalties>
          ap:      <integer; number of additional penalties>
          tp:      <integer; target (paper) points>
          sp:      <integer; steel points>
          pp:      <integer; procedural points + additional penalty points>
          mp:      <integer; misses points>
          smp:     <integer; steel misses points>
          nsp:     <integer; no-shoot points>
          spct_o:  <float;   stage percentage overall>
          spts_o:  <float;   stage points overall>
          spct_d:  <float;   stage percentage for division>
          spts_d:  <float;   stage points for division>
          dp:      <integer; place in division>
          dpo:     <integer; number shooters in division>
          op:      <integer; place overall>
          opo:     <integer; number shooters overall>
          shooterID: <string; UUID of shooter>
        },
        <shooter_uuid>: {
          ...
        }
      }
    }
  }
  overall: {
    combined: [
    ],
    <division_name>: [
      {
        shooter: <Shooter; shooter record>
        name:    <string;  shooter's full name>
        del:     <boolean; deleted from match>
        dq:      <boolean; DQed>
        dnf:     <boolean; did-not-fire>
        div:     <string;  division name>
        mpts_o:  <float;   match points overall>
        mpct_o:  <float;   match percentage overall>
        mpts_d:  <float;   match points for division>
        mpct_d:  <float;   match percentage for division>
        dp:      <integer; place in division>
        dpo:     <integer; number shooters in division>
        op:      <integer; place overall>
        opo:     <integer; number shooters overall>
      },
      {
        ...
      },
    ],
    <division_name>: [
      ...
    ],
  }
*/
Matchdef.prototype.calculateScores = function () {
  var self = this;
  var shooterCache = {};
  var stageCache = {};
  var matchScoresByStage = {};
  var matchScoresOverall = {};
  var highHF;
  var numShooters;
  var sortedScores;
  var stagePoints;
  var sortedScoresLength;
  var highDivisionHF;
  var divisionPlace;
  var stage;
  var scoresForThisStage;
  var shooterID;

  pmelog.time ('scores'); // _DEBUG

  //
  //  Get the list of match shooters and cache it. All shooters, deleted or
  //  DQed or not are in the list.
  //
  _.each (self.getShooters (), function (shooter) {
    shooterCache [shooter.getID ()] = {
      shooter: shooter,
      shooterID: shooter.getID (),
      name: shooter.getFullName (),
      mpts_o: 0,
      mpct_o: 0,
      mpts_d: 0,
      mpct_d: 0,
    };
  });

  //
  //  Build a cache of non-deleted stages
  //
  _.each (self.getStages (), function (stage) {
    if (!stage.isDeleted ()) {
      stageCache [stage.getID ()] = stage;
      matchScoresByStage [stage.getID ()] = {
        name: stage.getName (),
        isDeleted: stage.isDeleted (),
        isClassifier: stage.isClassifier (),
        classifierCode: stage.getClassifierCode (),
        scores: {},
      };
    }
  });

  //
  //  Iterate across each of the stages' scores.
  //
  _.each (self._accessorFunctions.getScores ().getMatchScores (), function (stageScores) {
    if ((stage = stageCache [stageScores.getID ()])) {
      scoresForThisStage = matchScoresByStage [stage.getID ()].scores;

      _.each (stageScores.getStageScores (), function (score) {
        shooterID = score.getShooterID ();
        assert (shooterCache [shooterID]);
        scoresForThisStage [shooterID] = calculateScore (stage, score, shooterCache [shooterID].shooter);
      });

      //
      //  Fixed time stages need the highest number of points
      //
      if (stage.isFixedTime ())
        stage.setStagePoints (_.max (scoresForThisStage, 'hf'));

      sortedScores = sortScoresByHF (scoresForThisStage);
      stagePoints = stage.getStagePoints ();
      sortedScoresLength = sortedScores.length;
      highDivisionHF = {};
      divisionPlace = {};
      highHF = 0;

      //
      //  If shooter is deleted, DNF'ed, or DQ'ed, then their hit factor, etc
      //  will all be zero.
      //
      _.each (sortedScores, function (_score, scoreIndex) {
        highHF = highHF || _score.hf;
        highDivisionHF [_score.div] = highDivisionHF [_score.div] || _score.hf;
        divisionPlace [_score.div] = divisionPlace [_score.div] || 0;
        _score.dp = ++divisionPlace [_score.div];
        _score.op = scoreIndex + 1;
        _score.opo = sortedScoresLength;

        shooterCache [_score.shooterID].dq  = _score.dq;
        shooterCache [_score.shooterID].dnf = _score.dnf;
        shooterCache [_score.shooterID].del = _score.del;
        shooterCache [_score.shooterID].div = _score.div;

        if (highHF) {
          _score.spct_o = (Math.round (_score.hf * 10000) / 10000) / (Math.round (highHF * 10000) / 10000);
          _score.spts_o = Math.round ((stagePoints * _score.spct_o) * 10000) / 10000;
          shooterCache [_score.shooterID].mpts_o += _score.spts_o;
        }
        if (highDivisionHF [_score.div]) {
          _score.spct_d = (Math.round (_score.hf * 10000) / 10000) / (Math.round (highDivisionHF [_score.div] * 10000) / 10000);
          _score.spts_d = Math.round ((stagePoints * _score.spct_d) * 10000) / 10000;
          shooterCache [_score.shooterID].mpts_d += _score.spts_d;
        }
      });

      _.each (sortedScores, function (_score) {
        _score.dpo = divisionPlace [_score.div];
      });
    }
  });

  //
  //  Sort overall from high points to lowest, with DQs going at the very
  //  bottom. They have zero points, but we want them to sort lower than
  //  shooters who zeroed the stage, so assign a point value of -3. Deleted
  //  shooters go below DQ'ed since they didn't even show up (they're normally
  //  filtered by the display function, but we need them at the bo
  //
  matchScoresOverall.combined = sortScoresByPoints (shooterCache, 'mpts_o');
  numShooters = matchScoresOverall.combined.length;
  highHF = 0;

  _.each (matchScoresOverall.combined, function (cacheEntry, index) {
    cacheEntry.op = index + 1;
    cacheEntry.opo = numShooters;
    highHF = highHF || cacheEntry.mpts_o;

    if (highHF)
      cacheEntry.mpct_o = cacheEntry.mpts_o / highHF;
  });

  _.each (self.getDivisions (), function (division) {
    matchScoresOverall [division] = sortScoresByPoints (shooterCache, 'mpts_d', division);
    numShooters = matchScoresOverall [division].length;
    highHF = 0;

    _.each (matchScoresOverall [division], function (cacheEntry, index) {
      cacheEntry.dp = index + 1;
      cacheEntry.dpo = numShooters;
      highHF = highHF || cacheEntry.mpts_d;

      if (highHF)
        cacheEntry.mpct_d = cacheEntry.mpts_d / highHF;
    });
  });

  var allScores = {
    bystage: matchScoresByStage,
    overall: matchScoresOverall,
  };

  return allScores;
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
//    ts    <array:integer>
//    udid  <string>
//  Adds:
//    apen  <integer>
//    ots   <integer>
//    penr  <string>
//
var Score = function () {
  score.Score.apply (this, Array.prototype.slice.call (arguments));

  this.apen = 0;
  this.ots = 0;
  this.penr = '';

  return this;
};

Score.prototype = Object.create (score.Score.prototype);

Score.prototype.get = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return this.ts [targetNumber];
};
Score.prototype.set = function (targetNumber, value) {
  validateTargetNumber (targetNumber);
  this.ts [targetNumber] = value || 0;
  this.updateTimestamp ();
  return this;
};
Score.prototype.getA = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return (this.ts [targetNumber] >> 0) & 0x0f;
};
Score.prototype.setA = function (targetNumber, aHits) {
  validateTargetNumber (targetNumber);
  validateTargetHits (aHits);
  this.ts [targetNumber] = (this.ts [targetNumber] & 0xfffffff0) | ((aHits & 0x0f) << 0);
  this.updateTimestamp ();
  return this;
};
Score.prototype.getB = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return (this.ts [targetNumber] >> 4) & 0x0f;
};
Score.prototype.setB = function (targetNumber, bHits) {
  validateTargetNumber (targetNumber);
  validateTargetHits (bHits);
  this.ts [targetNumber] = (this.ts [targetNumber] & 0xffffff0f) | ((bHits & 0x0f) << 4);
  this.updateTimestamp ();
  return this;
};
Score.prototype.getC = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return (this.ts [targetNumber] >> 8) & 0x0f;
};
Score.prototype.setC = function (targetNumber, cHits) {
  validateTargetNumber (targetNumber);
  validateTargetHits (cHits);
  this.ts [targetNumber] = (this.ts [targetNumber] & 0xfffff0ff) | ((cHits & 0x0f) << 8);
  this.updateTimestamp ();
  return this;
};
Score.prototype.getD = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return (this.ts [targetNumber] >> 12) & 0x0f;
};
Score.prototype.setD = function (targetNumber, dHits) {
  validateTargetNumber (targetNumber);
  validateTargetHits (dHits);
  this.ts [targetNumber] = (this.ts [targetNumber] & 0xffff0fff) | ((dHits & 0x0f) << 12);
  this.updateTimestamp ();
  return this;
};
Score.prototype.getNS = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return (this.ts [targetNumber] >> 16) & 0x0f;
};
Score.prototype.setNS = function (targetNumber, nsHits) {
  validateTargetNumber (targetNumber);
  validateTargetHits (nsHits);
  this.ts [targetNumber] = (this.ts [targetNumber] & 0xfff0ffff) | ((nsHits & 0x0f) << 16);
  this.updateTimestamp ();
  return this;
};
Score.prototype.getM = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return (this.ts [targetNumber] >> 20) & 0x0f;
};
Score.prototype.setM = function (targetNumber, mHits) {
  validateTargetNumber (targetNumber);
  validateTargetHits (mHits);
  this.ts [targetNumber] = (this.ts [targetNumber] & 0xff0fffff) | ((mHits & 0x0f) << 20);
  this.updateTimestamp ();
  return this;
};
Score.prototype.getNPM = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return (this.ts [targetNumber] >> 24) & 0x0f;
};
Score.prototype.setNPM = function (targetNumber, npmHits) {
  validateTargetNumber (targetNumber);
  validateTargetHits (npmHits);
  this.ts [targetNumber] = (this.ts [targetNumber] & 0xf0ffffff) | ((npmHits & 0x0f) << 24);
  return this;
};
Score.prototype.getAdditionalPenalties = function () {
  return this.apen || 0;
};
Score.prototype.setAdditionalPenalties = function (newProcedurals) {
  this.apen = parseInt (newProcedurals || '0');
  this.updateTimestamp ();
  return this;
};
Score.prototype.getOvertimeShots = function () {
  return this.ots || 0;
};
Score.prototype.setOvertimeShots = function (overtimeShots) {
  this.ots = parseInt (overtimeShots || '0');
  this.updateTimestamp ();
  return this;
};
Score.prototype.getPenaltiesReason = function () {
  return this.penr;
};
Score.prototype.setPenaltiesReason = function (reason) {
  this.penr = reason || '';
  this.mod  = psutils.timeStampUTC ();
  return this;
};
Score.prototype.getScoredHits = function (targetNumber) {
  validateTargetNumber (targetNumber);
  return this.getA (targetNumber) +
         this.getB (targetNumber) +
         this.getC (targetNumber) +
         this.getD (targetNumber) +
         this.getM (targetNumber) +
         this.getNPM (targetNumber);
};
Score.prototype.hitsToText = function (targetNumber) {
  validateTargetNumber (targetNumber);

  var hits = this.ts [targetNumber];
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
Score.prototype.merge = function (newScore, options, callback) {
  var self = this;
  var err;
  var changes = [];

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  options = _.merge (options, {onChangeScore: function (left, right, changeList) {
    merge.compare (left, right, 'apen', {force: true}, function (ov, nv) {changeList.push (sprintf ('    Additional penalties changed from %s to %s', ov, nv));});
    merge.compare (left, right, 'ots',  {force: true}, function (ov, nv) {changeList.push (sprintf ('    Overtime shots changed from %s to %s', ov, nv));});
  }});

  score.Score.prototype.merge.call (self, newScore, options, function (scoreErr, scoreChanges) {
    err = scoreErr;
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

  if (notcompact || self.apen)        s.apen = self.apen;
  if (notcompact || self.ots)         s.ots  = self.ots;
  if (notcompact || self.penr.length) s.penr = self.penr;

  return s;
};
Score.prototype.parse = function (jsonScore) {
  var self = this;
  var map = {
    apen: self.setAdditionalPenalties,
    ots:  self.setOvertimeShots,
    penr: self.setPenaltiesReason,
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
exports.Target = Target;
exports.Stage = Stage;
exports.Matchdef = Matchdef;
exports.Score = Score;
exports.StageScores = StageScores;
exports.MatchScores = MatchScores;
exports.MatchLog = MatchLog;
exports.Lookups = Lookups;
