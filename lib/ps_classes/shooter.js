'use strict';

var _ = require ('lodash');
var assert = require ('assert');
var diff = require ('deep-diff').diff;
var sprintf = require ('sprintf-js').sprintf;
var merge = require ('../merge');
var pmelog = require ('../pmelog');
var psutils = require ('../utils');

var diffShooter = function (func, left, right) {
  if (0) { // this._accessorFunctions.getConfig ().get ('debug', 'mergeDeepDiff')) {
    var diffList = diff (left, right);

    if (diffList) {
      pmelog.llog (pmelog.DEBUG, '%s(): Doing deep-diff on shooter \'%s %s\'', func, left.sh_fn || 'Unknown_fn', left.sh_ln || 'Unknown_ln');
      pmelog.ldirex (pmelog.DEBUG, diffList);
    }
  }
};

//
//
//
var Shooter = function (options) {
  var self = this;
  var tsUTC = psutils.timeStampUTC ();

  options = options || {};

  self._pendingChanges = false;
  self._fieldParsed    = {};

  self.sh_addr1   = '';
  self.sh_addr2   = '';
  self.sh_age     = 'ADULT';
  self.sh_cc      = '';
  self.sh_city    = '';
  self.sh_ctgs    = [];
  self.sh_del     = false;
  self.sh_dq      = false;
  self.sh_dqrule  = '';
  self.sh_dvp     = '';
  self.sh_eml     = '';
  self.sh_fn      = '';
  self.sh_frn     = false;
  self.sh_gen     = 'MALE';
  self.sh_grd     = '';
  self.sh_here    = false;
  self.sh_id      = '';
  self.sh_law     = false;
  self.sh_lge     = false;
  self.sh_lgp     = false;
  self.sh_ln      = '';
  self.sh_mil     = false;
  self.sh_mod     = tsUTC;
  self.sh_num     = 0;
  self.sh_paid    = false;
  self.sh_pf      = 'MINOR';
  self.sh_ph      = '';
  self.sh_pos     = options.sh_pos || 0;
  self.sh_print   = false;
  self.sh_seed    = 0;
  self.sh_sqd     = 0;
  self.sh_st      = '';
  self.sh_staff   = false;
  self.sh_team    = '';
  self.sh_type    = '';
  self.sh_team    = '';
  self.sh_uid     = psutils.generateUUID ();
  self.sh_uuid    = this.sh_uid;
  self.sh_wlk     = false;
  self.sh_zipcode = '';
  self.mod_dl     = tsUTC;
  self.mod_dq     = tsUTC;
  self.mod_dv     = tsUTC;
  self.mod_pf     = tsUTC;
  self.mod_pr     = tsUTC;
  self.mod_sq     = tsUTC;

  return self;
};

Shooter.prototype.className = function () {
  return 'Shooter';
};
Shooter.prototype.getAddr1 = function () {
  return this.sh_addr1;
};
Shooter.prototype.setAddr1 = function (newAddr1) {
  newAddr1 = newAddr1 || '';

  if (this.sh_addr1 !== newAddr1) {
    this.sh_addr1 = newAddr1;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getAddr2 = function () {
  return this.sh_addr2;
};
Shooter.prototype.setAddr2 = function (newAddr2) {
  newAddr2 = newAddr2 || '';

  if (this.sh_addr2 !== newAddr2) {
    this.sh_addr2 = newAddr2;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getAge = function () {
  return this.sh_age;
};
Shooter.prototype.setAge = function (newAge) {
  newAge = newAge || 'ADULT';

  if (this.sh_age !== newAge) {
    this.sh_age = newAge;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getCategories = function () {
  return _.isNull (this.sh_ctgs) ? [] : this.sh_ctgs;
};
Shooter.prototype.setCategories = function (newCategories) {
  try {
    newCategories = JSON.parse (newCategories);
  } catch (e) {
    newCategories = [];
  }

  this.sh_ctgs = newCategories;
  this.mod_pr = psutils.timeStampUTC ();
  this.sh_mod = this.mod_pr;
  return this;
};
//
//  Add a new category, but don't update the timestamps. This is called from
//  the match type shooter fixup for when sh_ctgs is empty.
//
Shooter.prototype.addCategoryFixup = function (newCategory) {
  this.sh_ctgs = this.sh_ctgs || [];

  if (_.indexOf (this.sh_ctgs, newCategory) === -1)
    this.sh_ctgs.push (newCategory);

  return this;
};
Shooter.prototype.getCity = function () {
  return this.sh_city;
};
Shooter.prototype.setCity = function (newCity) {
  newCity = newCity || '';

  if (this.sh_city !== newCity) {
    this.sh_city = newCity;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getCountryCode = function () {
  return this.sh_cc;
};
Shooter.prototype.setCountryCode = function (newCC) {
  newCC = newCC || '';

  if (this.sh_cc !== newCC) {
    this.sh_cc = newCC;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getDeleted = function () {
  return this.sh_del;
};
Shooter.prototype.getDeletedModified = function () {
  return this.mod_dl;
};
Shooter.prototype.isDeleted = function () {
  return this.sh_del;
};
Shooter.prototype.setDeleted = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setDeleted() argument must be boolean');

  if (this.sh_del !== state) {
    this.sh_del = state;
    this.mod_dl = psutils.timeStampUTC ();
    this.sh_mod = this.mod_dl;
  }

  return this;
};
Shooter.prototype.setIsDeleted = function () {
  return this.setDeleted (true);
};
Shooter.prototype.setIsNotDeleted = function () {
  return this.setDeleted (false);
};
Shooter.prototype.getDQ = function () {
  return this.sh_dq;
};
Shooter.prototype.getDQModified = function () {
  return this.mod_dq;
};
Shooter.prototype.isDQ = function () {
  return this.sh_dq === true;
};
Shooter.prototype.setDQ = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setDQ() argument must be boolean');

  if (this.sh_dq !== state) {
    this.sh_dq = state;
    this.mod_dq = psutils.timeStampUTC ();
    this.sh_mod = this.mod_dq;
  }

  return this;
};
Shooter.prototype.setIsDQ = function () {
  return this.setDQ (true);
};
Shooter.prototype.setIsNotDQ = function () {
  return this.setDQ (false);
};
Shooter.prototype.getDQRule = function () {
  return this.sh_dqrule || '';
};
Shooter.prototype.setDQRule = function (rule) {
  this.sh_dqrule = rule || '';
  return this;
};
Shooter.prototype.getDivision = function () {
  return this.sh_dvp;
};
Shooter.prototype.getDivisionModified = function () {
  return this.mod_dv;
};
Shooter.prototype.setDivision = function (newDivision) {
  newDivision = newDivision || 'INVALID';

  if (this.sh_dvp !== newDivision) {
    this.sh_dvp = newDivision;
    this.mod_dv = psutils.timeStampUTC ();
    this.sh_mod = this.mod_dv;
  }

  return this;
};
Shooter.prototype.getEmail = function () {
  return this.sh_eml;
};
Shooter.prototype.setEmail = function (newEmail) {
  this.sh_eml = newEmail || '';
  this.mod_pr = psutils.timeStampUTC ();
  this.sh_mod = this.mod_pr;
  return this;
};
Shooter.prototype.getFirstName = function () {
  return this.sh_fn;
};
Shooter.prototype.setFirstName = function (newFirstName) {
  newFirstName = newFirstName || '';

  if (this.sh_fn !== newFirstName) {
    this.sh_fn = newFirstName;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.isForeign = function () {
  return this.sh_frn;
};
Shooter.prototype.setForeign = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setForeign() argument must be boolean');

  if (this.sh_frn !== state) {
    this.sh_frn = state;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.setIsForeign = function () {
  return this.setForeign (true);
};
Shooter.prototype.getGender = function () {
  return this.sh_gen;
};
Shooter.prototype.isFemale = function () {
  return this.sh_gen === 'FEMALE';
};
Shooter.prototype.setGender = function (newGender) {
  newGender = newGender || 'MALE';

  if (this.sh_gen !== newGender) {
    this.sh_gen = newGender;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.setGenderFemale = function () {
  return this.setGender ('FEMALE');
};
Shooter.prototype.getClass = function () {
  return this.sh_grd;
};
Shooter.prototype.setClass = function (newClass) {
  newClass = newClass || 'INVALID';

  if (this.sh_grd !== newClass) {
    this.sh_grd = newClass;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.isHere = function () {
  return this.sh_here;
};
Shooter.prototype.setHere = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setHere() argument must be boolean');

  if (this.sh_here !== state) {
    this.sh_here = state;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getMembershipNumber = function () {
  return this.sh_id;
};
Shooter.prototype.setMembershipNumber = function (newID) {
  newID = newID || '';

  if (this.sh_id !== newID) {
    this.sh_id = newID;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.isLaw = function () {
  return this.sh_law;
};
Shooter.prototype.setLaw = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setLaw() argument must be boolean');

  if (this.sh_law !== state) {
    this.sh_law = state;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.setIsLaw = function () {
  return this.setLaw (true);
};
Shooter.prototype.getLoggingEmail = function () {
  return _.isNull (this.sh_lge) ? false : this.sh_lge;
};
Shooter.prototype.isLoggingEmail = function () {
  return _.isNull (this.sh_lge) ? false : this.sh_lge;
};
Shooter.prototype.setLoggingEmail = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setLoggingEmail() argument must be boolean');

  if (this.sh_lge !== state) {
    this.sh_lge = state;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.setIsLoggingEmail = function () {
  return this.setLoggingEmail (true);
};
Shooter.prototype.setIsNotLoggingEmail = function () {
  return this.setLoggingEmail (false);
};
Shooter.prototype.getLoggingPhone = function () {
  return _.isNull (this.sh_lgp) ? false : this.sh_lgp;
};
Shooter.prototype.isLoggingPhone = function () {
  return _.isNull (this.sh_lgp) ? false : this.sh_lgp;
};
Shooter.prototype.setLoggingPhone = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setLoggingPhone() argument must be boolean');

  if (this.sh_lgp !== state) {
    this.sh_lgp = state;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.setIsLoggingPhone = function () {
  return this.setLoggingPhone (true);
};
Shooter.prototype.setIsNotLoggingPhone = function () {
  return this.setLoggingPhone (false);
};
Shooter.prototype.getLastName = function () {
  return this.sh_ln;
};
Shooter.prototype.setLastName = function (newLastName) {
  newLastName = newLastName || '';

  if (this.sh_ln !== newLastName) {
    this.sh_ln = newLastName;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.isMilitary = function () {
  return this.sh_mil;
};
Shooter.prototype.setMilitary = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setMilitary() argument must be boolean');

  if (this.sh_mil !== state) {
    this.sh_mil = state;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.setIsMilitary = function () {
  return this.setMilitary (true);
};
Shooter.prototype.getNumber = function () {
  return this.sh_num;
};
Shooter.prototype.setNumber = function (newNumber) {
  newNumber = parseInt (newNumber || -1);

  if (this.sh_num !== newNumber) {
    this.sh_num = newNumber;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.isPaid = function () {
  return this.sh_paid;
};
Shooter.prototype.setPaid = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setPaid() argument must be boolean');

  if (this.sh_paid !== state) {
    this.sh_paid = state;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getPosition = function () {
  return this.sh_pos;
};
Shooter.prototype.getPowerFactor = function () {
  return this.sh_pf;
};
Shooter.prototype.getPowerFactorModified = function () {
  return this.mod_pf;
};
Shooter.prototype.isPowerFactorMajor = function () {
  return this.sh_pf === 'MAJOR';
};
Shooter.prototype.isPowerFactorMinor = function () {
  return this.sh_pf === 'MINOR';
};
Shooter.prototype.setPowerFactor = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setPowerFactor() argument must be boolean');

  state = (state ? 'MAJOR' : 'MINOR');

  if (this.sh_pf !== state) {
    this.sh_pf = state;
    this.mod_pf = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pf;
  }

  return this;
};
Shooter.prototype.setPowerFactorByName = function (pf) {
  return this.setPowerFactor (pf.toUpperCase () === 'MAJOR');
};
Shooter.prototype.setPowerFactorMajor = function () {
  return this.setPowerFactor (true);
};
Shooter.prototype.setPowerFactorMinor = function () {
  return this.setPowerFactor (false);
};
Shooter.prototype.getPhone = function () {
  return this.sh_ph;
};
Shooter.prototype.setPhone = function (newPhone) {
  newPhone = newPhone || '';
  newPhone = newPhone.replace (/[^0-9]/g, '');

  if (this.sh_ph !== newPhone) {
    this.sh_ph = newPhone;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getSeed = function () {
  return this.sh_seed || '';
};
Shooter.prototype.setSeed = function (newSeed) {
  newSeed = newSeed || 0;

  if (this.sh_seed !== newSeed) {
    this.sh_seed = newSeed;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.isStaff = function () {
  return this.sh_staff;
};
Shooter.prototype.setStaff = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setStaff() argument must be boolean');

  if (this.sh_staff !== state) {
    this.sh_staff = state;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getSquad = function () {
  return this.sh_sqd;
};
Shooter.prototype.getSquadModified = function () {
  return this.mod_sq;
};
Shooter.prototype.setSquad = function (newSquad) {
  newSquad = parseInt (newSquad || 0);

  if (this.sh_sqd !== newSquad) {
    this.sh_sqd = newSquad;
    this.mod_sq = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getState = function () {
  return this.sh_st || '';
};
// FIXME: Validate state. Ignore if sh_cc not USA? For sh_cc='USA' if valid state?
Shooter.prototype.setState = function (newState) {
  newState = newState || '';

  if (this.sh_st !== newState) {
    this.sh_st = newState;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getTeam = function () {
  return this.sh_team;
};
Shooter.prototype.setTeam = function (newTeam) {
  newTeam = newTeam || '';

  if (this.sh_team !== newTeam) {
    this.sh_team = newTeam;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getType = function () {
  return this.sh_type || '';
};
Shooter.prototype.setType = function (newType) {
  newType = newType || '';

  if (this.sh_type !== newType) {
    this.sh_type = newType;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getID = function () {
  return this.sh_uid;
};
Shooter.prototype.setID = function (newUID) {
  this.sh_uid = newUID.toUIDCase () || psutils.generateUUID ();
  return this;
};
Shooter.prototype.getUUID = function () {
  return this.sh_uuid;
};
Shooter.prototype.setUUID = function (newUUID) {
  this.sh_uuid = newUUID.toUUIDCase () || psutils.generateUUID ();
  return this;
};
Shooter.prototype.getWalkOn = function () {
  return this.sh_wlk;
};
Shooter.prototype.isWalkOn = function () {
  return this.sh_wlk;
};
Shooter.prototype.setWalkOn = function (state) {
  if (!_.isBoolean (state))
    throw new TypeError ('setWalkOn() argument must be boolean');

  if (this.sh_wlk !== state) {
    this.sh_wlk = state;
    // sh_wlk isn't protected by any mod_xx fields
    // this.mod_pr = psutils.timeStampUTC ();
    // this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.setIsWalkOn = function () {
  return this.setWalkOn (true);
};
Shooter.prototype.setIsNotWalkOn = function () {
  return this.setWalkOn (false);
};
Shooter.prototype.getZipcode = function () {
  return this.sh_zipcode;
};
Shooter.prototype.setZipcode = function (newZipCode) {
  newZipCode = newZipCode || '';
  newZipCode = newZipCode.replace (/[^0-9]/g, '');

  if (this.sh_zipcode !== newZipCode) {
    this.sh_zipcode = newZipCode;
    this.mod_pr = psutils.timeStampUTC ();
    this.sh_mod = this.mod_pr;
  }

  return this;
};
Shooter.prototype.getFullName = function () {
  return this.sh_fn + ' ' + this.sh_ln;
};
Shooter.prototype.getFullNameLastFirst = function () {
  return this.sh_ln + ', ' + this.sh_fn;
};
Shooter.prototype.getProfileModified = function () {
  return this.mod_pr;
};
Shooter.prototype.setProfileModified = function () {
  this.mod_pr = psutils.timeStampUTC ();
  return this;
};
Shooter.prototype.overrideTimestampDeleted = function (newTS) {
  this.mod_dl = newTS || psutils.timeStampUTC ();
  return this;
};
Shooter.prototype.overrideTimestampDQ = function (newTS) {
  this.mod_dq = newTS || psutils.timeStampUTC ();
  return this;
};
Shooter.prototype.overrideTimestampDivision = function (newTS) {
  this.mod_dv = newTS || psutils.timeStampUTC ();
  return this;
};
Shooter.prototype.overrideTimestampPowerFactor = function (newTS) {
  this.mod_pf = newTS || psutils.timeStampUTC ();
  return this;
};
Shooter.prototype.overrideTimestampProfile = function (newTS) {
  this.mod_pr = newTS || psutils.timeStampUTC ();
  return this;
};
Shooter.prototype.overrideTimestampSquad = function (newTS) {
  this.mod_sq = newTS || psutils.timeStampUTC ();
  return this;
};
Shooter.prototype.overrideTimestampShooter = function (newTS) {
  this.sh_mod = newTS || psutils.timeStampUTC ();
  return this;
};
Shooter.prototype.overrideID = function (newUID) {
  assert (newUID, 'Missing UID in Shooter.overrideID()');
  this.sh_uid = newUID.toUIDCase ();
  this.sh_uuid = this.sh_uid;
  return this;
};
Shooter.prototype.getNewestTimestamp = function () {
  var ts = this.sh_mod;

  if (this.mod_dl > ts)
    ts = this.mod_dl;
  if (this.mod_dq > ts)
    ts = this.mod_dq;
  if (this.mod_dv > ts)
    ts = this.mod_dv;
  if (this.mod_pf > ts)
    ts = this.mod_pf;
  if (this.mod_pr > ts)
    ts = this.mod_pr;
  if (this.mod_sq > ts)
    ts = this.mod_sq;

  return ts;
};
Shooter.prototype.printAdd = function (callback) {
  this.sh_print = true;
  if (callback)
    callback (null);
  return this;
};
Shooter.prototype.printRemove = function (callback) {
  var changed = (this.sh_print === true);
  this.sh_print = false;
  if (callback)
    callback (null, changed);
  return this;
};
Shooter.prototype.setNumberToPos = function (options, callback) {
  var self = this;
  var copy = _.clone (self);

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  if (options.override) {
    if (options.override !== copy.sh_num) {
      copy.sh_num = options.override;
      copy.mod_pr = psutils.timeStampUTC ();
      copy.sh_mod = copy.mod_pr;
      copy._fieldParsed.sh_num = true;
      copy._fieldParsed.mod_pr = true;
      copy._fieldParsed.sh_mod = true;
    }
  } else {
    if (copy.sh_num !== copy.sh_pos) {
      copy.sh_num = copy.sh_pos || -1;
      copy.mod_pr = psutils.timeStampUTC ();
      copy.sh_mod = copy.mod_pr;
      copy._fieldParsed.sh_num = true;
      copy._fieldParsed.mod_pr = true;
      copy._fieldParsed.sh_mod = true;
    }
  }

  diffShooter.call (self, 'setNumberToPos', self, copy);

  self.merge (copy, {nodebug: true}, function (err, changes) {
    if (callback)
      callback (err, changes);
  });

  return self;
};
Shooter.prototype.depersonalize = function (callback) {
  var self = this;
  var copy = _.clone (self);
  var modified = false;

  _.each (['sh_addr1', 'sh_addr2', 'sh_city', 'sh_eml', 'sh_lge', 'sh_lgp', 'sh_ph', 'sh_zipcode'], function (field) {
    if (_.isString (copy [field]) && copy [field].length) {
      copy [field] = '';
      copy._fieldParsed [field] = true;
      modified = true;
    } else if (_.isBoolean (copy [field])) {
      copy [field] = false;
      copy._fieldParsed [field] = true;
      modified = true;
    }
  });

  if (modified) {
    copy.mod_pr = psutils.timeStampUTC ();
    copy.sh_mod = copy.mod_pr;
    copy._fieldParsed.mod_pr = true;
    copy._fieldParsed.sh_mod = true;

    diffShooter.call (self, 'depersonalize', self, copy);

    self.merge (copy, {nodebug: true}, function (err, changes) {
      if (callback)
        callback (err, changes);
    });
  }

  return self;
};
Shooter.prototype.stripBadMembershipNumber = function (memberRegex, callback) {
  var self = this;
  var copy;
  var membershipNumber;

  if (!memberRegex && !callback)
    pmelog.llog (pmelog.ERROR, 'Shooter.prototype.stripBadMembershipNumber() should be implemented in match class for this match type!');
  else {
    copy = _.clone (self);
    membershipNumber = self.getMembershipNumber ();

    if (membershipNumber.length && !memberRegex.test (membershipNumber)) {
      copy.sh_id = '';
      copy.mod_pr = psutils.timeStampUTC ();
      copy.sh_mod = copy.mod_pr;
      copy._fieldParsed.sh_id  = true;
      copy._fieldParsed.mod_pr = true;
      copy._fieldParsed.sh_mod = true;
    }

    self.merge (copy, {nodebug: true}, function (err, changes) {
      if (callback)
        callback (err, changes);
    });
  }

  return self;
};
Shooter.prototype.toNameCase = function (callback) {
  var self = this;
  var copy = _.clone (self);

  _.each (['sh_fn', 'sh_ln', 'sh_addr1', 'sh_addr2', 'sh_city'], function (field) {
    copy [field] = copy [field].trim ().replace (/^[\W+]/, '').toNameCase ();

    if (copy [field] !== self [field]) {
      copy.mod_pr = psutils.timeStampUTC ();
      copy.sh_mod = copy.mod_pr;
    }
  });

  if (!copy.sh_fn.match (/[aeiou]|^[^aeiou].*y/i)) {
    copy.sh_fn = copy.sh_fn.toUpperCase ();
    copy.mod_pr = psutils.timeStampUTC ();
    copy.sh_mod = copy.mod_pr;
  }

  diffShooter.call (self, 'toNameCase', self, copy);

  self.merge (copy, {nodebug: true}, function (err, changes) {
    if (callback)
      callback (err, changes);
  });

  return self;
};
Shooter.prototype.fixup = function (parent, position, options) {
  var self = this;

  options = options || {};

  self.sh_pos = position;
  // self.sh_uid = self.sh_uid.toUIDCase ();
  // self.sh_uuid = self.sh_uuid.toUUIDCase ();

  _.each (['sh_addr1', 'sh_addr2', 'sh_city', 'sh_eml', 'sh_fn', 'sh_id', 'sh_ln', 'sh_ph', 'sh_zipcode'], function (k) {
    self [k] = self [k].trim ();
  });

  _.each (['sh_ph', 'sh_zipcode'], function (k) {
    self [k] = self [k].replace (/[^0-9]/g, '');
  });

  _.each (['sh_eml'], function (k) {
    self [k] = self [k].toLowerCase ();
  });

  if (options.fixNameCase) {
    _.each (['sh_fn', 'sh_ln', 'sh_addr1', 'sh_addr2', 'sh_city'], function (k) {
      self [k] = self [k].trim ().replace (/^[\W+]/, '').toNameCase ();
    });
  }

  return self;
};
Shooter.prototype.merge = function (newShooter, options, callback) {
  var self = this;
  var changes = [];
  var shooterName;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  assert (_.isObject (options), 'Shooter.prototype.merge: options is not Object');
  assert (_.isFunction (callback), 'Shooter.prototype.merge: callback is not function');
  assert (newShooter, 'Shooter.prototype.merge: newShooter cannot be null or undefined');

  shooterName = self.getFirstName () + ' ' + self.getLastName ();

  //
  //  sh_mod should always be >= mod_*. Except some bozo in the Android
  //  version doesn't set sh_mod, thus entirely defeating the purpose of
  //  having a high-level time check.
  //
  if (false) {
    _.each (['mod_dl', 'mod_dq', 'mod_dv', 'mod_pr', 'mod_sq'], function (m) {
      if (merge.isNewer (newShooter.sh_mod, newShooter [m]))
        pmelog.llog (pmelog.DEBUG, "Shooter %s %s has %s (%s) > sh_mod (%s)",
          newShooter.sh_fn, newShooter.sh_ln, m, newShooter [m], newShooter.sh_mod);
    });
  }

  if (_.isFunction (options.onChangeShooter))
    self._fieldChanged = {};

  diffShooter.call (self, 'merge', self, newShooter);

  if (true /* EK is an idiot -- merge.rightTimestampIsNewer (self, newShooter, 'sh_mod', options) */) {
    if (merge.rightTimestampIsNewer (self, newShooter, 'mod_pr', options)) {
      merge.compare (self, newShooter, 'sh_addr1',   function (ov, nv) {changes.push (sprintf ('    Address 1 changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_addr2',   function (ov, nv) {changes.push (sprintf ('    Address 2 changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_age',     function (ov, nv) {changes.push (sprintf ('    Age changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_cc',      function (ov, nv) {changes.push (sprintf ('    Country code changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_city',    function (ov, nv) {changes.push (sprintf ('    City changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_ctgs',    function (ov, nv) {changes.push (sprintf ('    Categories changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_eml',     function (ov, nv) {changes.push (sprintf ('    Email changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_fn',      function (ov, nv) {changes.push (sprintf ('    First name changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_frn',     function (ov, nv) {changes.push (sprintf ('    Foreign changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'sh_gen',     function (ov, nv) {changes.push (sprintf ('    Gender changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_grd',     function (ov, nv) {changes.push (sprintf ('    Class changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_here',    function (ov, nv) {changes.push (sprintf ('    Here changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_id',      function (ov, nv) {changes.push (sprintf ('    Membership number changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_law',     function (ov, nv) {changes.push (sprintf ('    Law changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'sh_lge',     function (ov, nv) {changes.push (sprintf ('    Email logging changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'sh_lgp',     function (ov, nv) {changes.push (sprintf ('    Phone logging changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'sh_ln',      function (ov, nv) {changes.push (sprintf ('    Last name changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_mil',     function (ov, nv) {changes.push (sprintf ('    Military changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'sh_num',     function (ov, nv) {changes.push (sprintf ('    Shooter number changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'sh_paid',    function (ov, nv) {changes.push (sprintf ('    Paid changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_ph',      function (ov, nv) {changes.push (sprintf ('    Phone changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_seed',    function (ov, nv) {changes.push (sprintf ('    Seed changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_st',      function (ov, nv) {changes.push (sprintf ('    State changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_staff',   function (ov, nv) {changes.push (sprintf ('    Staff changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_team',    function (ov, nv) {changes.push (sprintf ('    Team changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_type',    function (ov, nv) {changes.push (sprintf ('    Type changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'sh_zipcode', function (ov, nv) {changes.push (sprintf ('    Zipcode changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'mod_pr');
    }
    if (merge.rightTimestampIsNewer (self, newShooter, 'mod_dl', options)) {
      merge.compare (self, newShooter, 'sh_del',  function (ov, nv) {changes.push (sprintf ('    Deleted changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'mod_dl');
    }
    if (merge.rightTimestampIsNewer (self, newShooter, 'mod_dq', options)) {
      merge.compare (self, newShooter, 'sh_dq',     function (ov, nv) {changes.push (sprintf ('    DQ changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'sh_dqrule', function (ov, nv) {changes.push (sprintf ('    DQ rule changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'mod_dq');
    }
    if (merge.rightTimestampIsNewer (self, newShooter, 'mod_dv', options)) {
      merge.compare (self, newShooter, 'sh_dvp',  function (ov, nv) {changes.push (sprintf ('    Division changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'mod_dv');
    }
    if (merge.rightTimestampIsNewer (self, newShooter, 'mod_pf', options)) {
      merge.compare (self, newShooter, 'sh_pf',   function (ov, nv) {changes.push (sprintf ('    Power factor changed from \'%s\' to \'%s\'', ov, nv));});
      merge.compare (self, newShooter, 'mod_pf');
    }
    if (merge.rightTimestampIsNewer (self, newShooter, 'mod_sq', options)) {
      merge.compare (self, newShooter, 'sh_sqd',  function (ov, nv) {changes.push (sprintf ('    Squad changed from %s to %s', ov, nv));});
      merge.compare (self, newShooter, 'mod_sq');
    }

    merge.compare (self, newShooter, 'sh_mod');

    if (_.isFunction (options.onChangeShooter)) {
      options.onChangeShooter (self, changes);
      delete self._fieldChanged;
    }
  }

  if (changes.length)
    changes.unshift (sprintf ('  Shooter \'%s\' modified:', shooterName));

  if (callback)
    callback (null, changes);

  return self;
};
Shooter.prototype.update = function (shooterInfo, options, callback) {
  var self = this;
  var now = psutils.timeStampUTC ();
  var list = {
    mod_pr: ['sh_addr1', 'sh_addr2', 'sh_age', 'sh_cc', 'sh_city', 'sh_ctgs', 'sh_eml', 'sh_fn', 'sh_frn', 'sh_gen', 'sh_grd', 'sh_here', 'sh_id', 'sh_law', 'sh_lge', 'sh_lgp', 'sh_ln', 'sh_mil', 'sh_num', 'sh_paid', 'sh_ph', 'sh_pos', 'sh_seed', 'sh_st', 'sh_staff', 'sh_team', 'sh_type', 'sh_wlk', 'sh_zipcode'],
    mod_dl: ['sh_del'],
    mod_dq: ['sh_dq'],
    mod_dv: ['sh_dvp'],
    mod_pf: ['sh_pf'],
    mod_sq: ['sh_sqd'],
  };

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};
  options = _.merge (options, {nodebug: true});

  //
  //  This sucks. shooterInfo is JSON, and not an object. We want to fix any
  //  bad fields before we check for changes, so it they are different, then
  //  they'll get picked up as changes. If we do it afterwards, the mod_*
  //  fields won't be updated. So we're going to have to duplicate the fixup
  //  code, except not bother with fixing name case.
  //
  _.each (['sh_addr1', 'sh_addr2', 'sh_city', 'sh_eml', 'sh_fn', 'sh_id', 'sh_ln', 'sh_ph', 'sh_zipcode'], function (k) {
    if (_.isString (shooterInfo [k]))
      shooterInfo [k] = shooterInfo [k].trim ();
  });

  _.each (['sh_ph', 'sh_zipcode'], function (k) {
    if (_.isString (shooterInfo [k]))
      shooterInfo [k] = shooterInfo [k].replace (/[^0-9]/g, '');
  });

  _.each (['sh_eml'], function (k) {
    if (_.isString (shooterInfo [k]))
      shooterInfo [k] = shooterInfo [k].toLowerCase ();
  });

  //
  //  Normally when data comes from a .psc file, or a sync with another device,
  //  etc, we can trust the sh_ctgs field to be correct. However, internally
  //  (like when editing competitors), we deal with the discreet fields
  //  (sh_age, sh_gen, sh_mil, sh_law, sh_frn), because they're more match type
  //  specific. So if preferDiscreet is true, we're going clear the sh_ctgs
  //  array and set it according to the discreet values. We prefer the discreet
  //  fields so that a competitor can't be both a junior and a super senior.
  //
  //  Technically, the order in the sh_ctgs field isn't important, but unless
  //  someone has re-arranged them in PractiScore, this will be the normal
  //  order, and the least likely to cause a change in the sh_ctgs field.
  //
  if (!_.isString (options.prefer) || ((options.prefer !== 'discrete') && (options.prefer !== 'tags')))
    options.prefer = 'discrete';

  if (options.prefer === 'discrete') {
    shooterInfo.sh_ctgs = _.pull (shooterInfo.sh_ctgs, 'Lady', 'Preteen', 'Junior', 'Senior', 'Super Senior', 'Law Enforcement', 'Military', 'Foreign');

    if (shooterInfo.sh_gen === 'FEMALE')
      shooterInfo.sh_ctgs.push ('Lady');

    switch (shooterInfo.sh_age) {
      case 'PRETEEN' : shooterInfo.sh_ctgs.push ('Preteen'); break;
      case 'JUNIOR'  : shooterInfo.sh_ctgs.push ('Junior'); break;
      case 'ADULT'   : break;
      case 'SENIOR'  : shooterInfo.sh_ctgs.push ('Senior'); break;
      case 'SUPSNR'  : shooterInfo.sh_ctgs.push ('Super Senior'); break;
      default        : break;
    }

    if (shooterInfo.sh_law)
      shooterInfo.sh_ctgs.push ('Law Enforcement');
    if (shooterInfo.sh_mil)
      shooterInfo.sh_ctgs.push ('Military');
    if (shooterInfo.sh_frn)
      shooterInfo.sh_ctgs.push ('Foreign');
  }

  if (options.prefer === 'tags') {
    if (_.indexOf (shooterInfo.sh_ctgs, 'Preteen') > -1)
      shooterInfo.sh_age = 'PRETEEN';
    else if (_.indexOf (shooterInfo.sh_ctgs, 'Junior') > -1)
      shooterInfo.sh_age = 'JUNIOR';
    else if (_.indexOf (shooterInfo.sh_ctgs, 'Senior') > -1)
      shooterInfo.sh_age = 'SENIOR';
    else if (_.indexOf (shooterInfo.sh_ctgs, 'Super Senior') > -1)
      shooterInfo.sh_age = 'SUPSNR';
    else
      shooterInfo.sh_age = 'ADULT';

    shooterInfo.sh_gen = (_.indexOf (shooterInfo.sh_ctgs, 'Lady') > -1) ? 'FEMALE' : 'MALE';
    shooterInfo.sh_law = (_.indexOf (shooterInfo.sh_ctgs, 'Law Enforcement') > -1) ? true : false;
    shooterInfo.sh_mil = (_.indexOf (shooterInfo.sh_ctgs, 'Military') > -1) ? true : false;
    shooterInfo.sh_frn = (_.indexOf (shooterInfo.sh_ctgs, 'Foreign') > -1) ? true : false;
  }

  //
  //  Process the fields in 'list', and for any fields that are different
  //  between the object (ourself) and shooterInfo, update that field, and
  //  update the corresponding mod_* timestamp field.
  //
  shooterInfo._fieldParsed = shooterInfo._fieldParsed || [];

  _.each (list, function (fields, tsName) {
    _.each (fields, function (fieldName) {
      if (_.has (shooterInfo, fieldName)) {
        if (_.isString (shooterInfo [fieldName]))
          shooterInfo [fieldName] = shooterInfo [fieldName].trim ();
        if (!_.isEqual (self [fieldName], shooterInfo [fieldName])) {
          shooterInfo._fieldParsed [fieldName] = true;
          shooterInfo._fieldParsed [tsName] = true;
          shooterInfo._fieldParsed.sh_mod = true;
          shooterInfo [tsName] = now;
          shooterInfo.sh_mod = now;
        }
      }
    });
  });

  diffShooter.call (self, 'update', self, shooterInfo);

  self.merge (shooterInfo, options, function (err, changes) {
    if (callback)
      callback (err, changes);
  });

  return self;
};
Shooter.prototype.getAsPlainObject = function (options) {
  var self = this;
  var s = {};
  var notcompact = !options || !options.compact;
  var nostringify = options && options.nostringify;

  if (notcompact || self.sh_addr1.length)  s.sh_addr1   = self.sh_addr1;
  if (notcompact || self.sh_addr2.length)  s.sh_addr2   = self.sh_addr2;
  if (notcompact || self.sh_age.length)    s.sh_age     = self.sh_age;
  if (notcompact || self.sh_cc.length)     s.sh_cc      = self.sh_cc;
  if (notcompact || self.sh_city.length)   s.sh_city    = self.sh_city;
  if (notcompact || self.sh_ctgs.length)   s.sh_ctgs    = (nostringify ? self.sh_ctgs : JSON.stringify (self.sh_ctgs));
  if (notcompact || self.sh_del)           s.sh_del     = self.sh_del;
  if (notcompact || self.sh_dq)            s.sh_dq      = self.sh_dq;
  if (notcompact || self.sh_dqrule.length) s.sh_dqrule  = self.sh_dqrule;
  if (notcompact || self.sh_dvp.length)    s.sh_dvp     = self.sh_dvp;
  if (notcompact || self.sh_eml.length)    s.sh_eml     = self.sh_eml;
  if (notcompact || self.sh_fn.length)     s.sh_fn      = self.sh_fn;
  if (notcompact || self.sh_frn)           s.sh_frn     = self.sh_frn;
  if (notcompact || self.sh_gen.length)    s.sh_gen     = self.sh_gen;
  if (notcompact || self.sh_grd.length)    s.sh_grd     = self.sh_grd;
  if (notcompact || self.sh_here)          s.sh_here    = self.sh_here;
  if (notcompact || self.sh_id.length)     s.sh_id      = self.sh_id;
  if (notcompact || self.sh_law)           s.sh_law     = self.sh_law;
  if (notcompact || self.sh_lge)           s.sh_lge     = self.sh_lge;
  if (notcompact || self.sh_lgp)           s.sh_lgp     = self.sh_lgp;
  if (notcompact || self.sh_ln.length)     s.sh_ln      = self.sh_ln;
  if (notcompact || self.sh_mil)           s.sh_mil     = self.sh_mil;
  if (notcompact || self.sh_mod.length)    s.sh_mod     = self.sh_mod;
  if (notcompact || self.sh_num)           s.sh_num     = self.sh_num;
  if (notcompact || self.sh_paid)          s.sh_paid    = self.sh_paid;
  if (notcompact || self.sh_pf.length)     s.sh_pf      = self.sh_pf;
  if (notcompact || self.sh_ph.length)     s.sh_ph      = self.sh_ph;
  if (notcompact || self.sh_seed)          s.sh_seed    = self.sh_seed;
  if (notcompact || self.sh_sqd)           s.sh_sqd     = self.sh_sqd;
  if (notcompact || self.sh_st.length)     s.sh_st      = self.sh_st;
  if (notcompact || self.sh_staff)         s.sh_staff   = self.sh_staff;
  if (notcompact || self.sh_team)          s.sh_team    = self.sh_team;
  if (notcompact || self.sh_type)          s.sh_type    = self.sh_type;
  if (notcompact || self.sh_uid.length)    s.sh_uid     = self.sh_uid;
  if (notcompact || self.sh_uuid.length)   s.sh_uuid    = self.sh_uuid;
  if (notcompact || self.sh_wlk)           s.sh_wlk     = self.sh_wlk;
  if (notcompact || self.sh_zipcode)       s.sh_zipcode = self.sh_zipcode;
  if (notcompact || self.mod_dl.length)    s.mod_dl     = self.mod_dl;
  if (notcompact || self.mod_dq.length)    s.mod_dq     = self.mod_dq;
  if (notcompact || self.mod_dv.length)    s.mod_dv     = self.mod_dv;
  if (notcompact || self.mod_pf.length)    s.mod_pf     = self.mod_pf;
  if (notcompact || self.mod_pr.length)    s.mod_pr     = self.mod_pr;
  if (notcompact || self.mod_sq.length)    s.mod_sq     = self.mod_sq;

  //
  //  These are not actual PractiScore variables, they're internal to PMM
  //  Currently they'll be exported with the match when syncing or writing
  //  to a file or database, but unknown variables don't cause any issues.
  //
  if (notcompact || self.sh_pos)           s.sh_pos     = self.sh_pos;
  if (notcompact || self.sh_print)         s.sh_print   = self.sh_print;

  return s;
};
Shooter.prototype.parse = function (jsonShooter) {
  var self = this;
  var map = {
    sh_addr1:   self.setAddr1,
    sh_addr2:   self.setAddr2,
    sh_age:     self.setAge,
    sh_cc:      self.setCountryCode,
    sh_city:    self.setCity,
    sh_ctgs:    self.setCategories,
    sh_del:     self.setDeleted,
    sh_dq:      self.setDQ,
    sh_dqrule:  self.setDQRule,
    sh_dvp:     self.setDivision,
    sh_eml:     self.setEmail,
    sh_fn:      self.setFirstName,
    sh_frn:     self.setForeign,
    sh_gen:     self.setGender,
    sh_grd:     self.setClass,
    sh_here:    self.setHere,
    sh_id:      self.setMembershipNumber,
    sh_law:     self.setLaw,
    sh_lge:     self.setLoggingEmail,
    sh_lgp:     self.setLoggingPhone,
    sh_ln:      self.setLastName,
    sh_mil:     self.setMilitary,
    sh_num:     self.setNumber,
    sh_paid:    self.setPaid,
    sh_pf:      self.setPowerFactorByName,
    sh_ph:      self.setPhone,
    sh_seed:    self.setSeed,
    sh_sqd:     self.setSquad,
    sh_st:      self.setState,
    sh_staff:   self.setStaff,
    sh_team:    self.setTeam,
    sh_type:    self.setType,
    sh_uid:     self.setID,
    sh_uuid:    self.setUUID,
    sh_wlk:     self.setWalkOn,
    sh_zipcode: self.setZipcode,
    mod_dl:     self.overrideTimestampDeleted,
    mod_dq:     self.overrideTimestampDQ,
    mod_dv:     self.overrideTimestampDivision,
    mod_pf:     self.overrideTimestampPowerFactor,
    mod_pr:     self.overrideTimestampProfile,
    mod_sq:     self.overrideTimestampSquad,
    sh_mod:     self.overrideTimestampShooter,
  };

  if (!jsonShooter)
    return self;

  _.each (_.keys (map), function (key) {
    if (key in jsonShooter) {
      map [key].call (self, jsonShooter [key]);
      self._fieldParsed [key] = true;
    } else
      self._fieldParsed [key] = false;
  });

  //
  //  clubs.practiscore.com only sets sh_uuid. In the iOS version, if sh_uid is
  //  not set, it will set it to sh_uuid. We'll play the same way.
  //
  if (!_.isUndefined (jsonShooter.sh_uuid) && _.isUndefined (jsonShooter.sh_uid))
    self.setID (self.getUUID ());

  return self;
};

exports.Shooter = Shooter;
