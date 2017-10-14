'use strict';

var _ = require ('lodash');
// var assert = require ('assert');
var pmelog = require ('./pmelog');

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
//  Return true if rightString greather than leftString
//
var isNewer = function (leftString, rightString) {
  if (_.isNull (leftString) && _.isNull (rightString))
    return false;

  if (_.isNull (leftString) && !_.isNull (rightString))
    return true;

  if (!_.isNull (leftString) && _.isNull (rightString))
   return true;

  return (rightString > leftString);
};

//
//  Return true if timestamp field in rightObject is newer than leftObject.
//
var rightTimestampIsNewer = function (leftObject, rightObject, timestampField, options, callback) {
  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (_.isUndefined (rightObject) || (timestampField && !rightObject [timestampField]))
    return false;

  if (!_.isUndefined (leftObject) && (timestampField && !isNewer (leftObject [timestampField], rightObject [timestampField])))
    return false;

  if (!leftObject && rightObject)
    return true;

  if (!options.nodebug)
    pmelog.llog (pmelog.DEBUG, 'rightTimestampIsNewer: %s differs, leftObject=%s, rightObject=%s', timestampField, leftObject [timestampField], rightObject [timestampField]);

  if (callback)
    callback (timestampField, leftObject [timestampField], rightObject [timestampField]);

  return true;
};

//
//  options.force
//    True will force the field to be evaluate for merging if the the left and
//    right sides are different, even if the field was not found in the right
//    side. This is useful for fields that are only present when set, such as
//    the USPSA 'apen' field in a score.
//
//  options.noMerge
//    True will cause the callback to be called if the fields are different,
//    but will not merge the newer right side values to the left side. This is
//    useful to determine if something changed, but an update is not desired.
//
//  options.addNew
//    When false, an array or field on the right will replace an array or field
//    on the left.  When true, if both entries are of type Array, entries that
//    exist in the right array will be appended to the left array, rather than
//    replacing the entire array. Used when merging arrays, such as USPSA
//    categories.
//
var mergeCompare = function (left, right, field, options, callback) {
  var different = false;
  var changed = false;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (options.onlyIfRightParsed && !right._fieldParsed [field])
    return false;

  if (_.isArray (left [field]) && _.isArray (right [field]) && (right [field].length !== _.intersection (right [field], left [field]).length))
    different = true;
  else if (!_.isEqual (left [field], right [field]))
    different = true;

  if (different) {
    var fmt = function (item, side) {
      if (_.isFinite (item))
        return item.toString ();
      if (_.isString (item))
        return item || '';
      if (_.isArray (item))
        return '[' + item.toString () + ']';
      if (_.isBoolean (item))
        return item ? 'true' : 'false';

      pmelog.llog (pmelog.DEBUG, 'mergeCompare(): Object format is not isFinite, isString or isArray for field \'%s\' (%s)', field, side === 'l' ? 'left' : 'right');

      if (side === 'r') {
        if (_.isFinite (left [field]))
          item = '0';
        else if (_.isString (left [field]))
          item = '';
        else if (_.isArray (left [field]))
          item = [];
        else if (_.isBoolean (left [field]))
          item = 'false';

        pmelog.llog (pmelog.DEBUG, '  Forcing type to %s', typeof (left [field]));
      }

      return item;
    };

    if (right._fieldParsed [field] || options.force) {
      if (callback)
        callback (fmt (left [field], 'l'), fmt (right [field], 'r'));

      if (!options.noMerge) {
        if (!options.addNew)
          left [field] = right [field];
        else if (_.isArray (left [field]) && _.isArray (right [field]))
          left [field] = _.sortBy (_.union (left [field], right [field]));
        else
          throw new ConversionError ('merge.compare(): both sides not typeof Array');

        if (!right._fieldParsed [field])
          pmelog.llog (pmelog.DEBUG, 'merge.compare(): field \'%s\' changed from \'%s\' to \'%s\', right._fieldParsed [%s]=false, force.override=true!', field, fmt (left [field]), fmt (right [field]), field);
      }

      if (left._fieldChanged)
        left._fieldChanged [field] = true;
      changed = true;
    } else
      pmelog.llog (pmelog.WARN, 'merge.compare(): field \'%s\' changed from \'%s\' to \'%s\', but right._fieldParsed [%s] is false!', field, fmt (left [field], 'l'), fmt (right [field], 'r'), field);
  }

  return changed;
};

//
//  Much like mergeCompare, only the array contains actual objects. This may be
//  an array of Bonus or Penalty objects.  If the right side is shorter, then
//  only update that many elements. If the right side is longer, any new
//  entries will be appended.
//
var mergeCompareArrayOfObjects = function (left, right, field, callback) {
  var changed = false;
  var leftSide;
  var rightSide;

  leftSide = left [field];
  rightSide = right [field];

  if (!_.isArray (leftSide)) {
    pmelog.llog (pmelog.DEBUG, 'field=%s', field);
    pmelog.ldirex (pmelog.DEBUG, left [field]);
    pmelog.ldirex (pmelog.DEBUG, leftSide);
    throw new ConversionError ('merge.compareArrayOfObjects(): left side not typeof Array');
  }

  if (!_.isArray (rightSide)) {
    pmelog.llog (pmelog.DEBUG, 'field=%s', field);
    pmelog.ldirex (pmelog.DEBUG, right [field]);
    pmelog.ldirex (pmelog.DEBUG, rightSide);
    throw new ConversionError ('merge.compareArrayOfObjects(): right side not typeof Array');
  }

  //
  //  For any objects in right side that aren't in left, add to the left side.
  //
  _.each (rightSide, function (rightObject) {
    if (!rightObject.compare (leftSide)) {
      leftSide.push (rightObject);

      if (callback)
        callback (['  Adding ' + rightObject.className ().toLowerCase () + ' ' + rightObject.getName ()]);

      changed = true;
    }
  });

  if (left._fieldChanged)
    left._fieldChanged [field] = changed;

  return changed;
};

//
//  Compares a simple array, such as an array of integers, like that used for
//  bonuses and penalties. The index of the entry corresponds to a bonus or
//  penalty, and the value is the count of that particular bonus or penalty.
//
//  FIXME: Need to check if left and right are the same length, throw warning
//  if not. If left is longer, update left with values from right that it has.
//  If left and right are the same length, or right is longer, just overwrite
//  left.
//
var mergeCompareArray = function (left, right, field, options, callback) {
  var changed = false;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  if (!_.isArray (left [field]) || !_.isArray (right [field]))
    throw new ConversionError ('merge.compareArray(): both sides not typeof Array');

  if (left [field].length !== right [field].length)
    pmelog.llog (pmelog.ERROR, '\'%s\' arrays have different lengths (left=%d, right=%d)', field, left [field].length, right [field].length);

  _.each (left [field], function (f, i) {
    if (!_.isEqual (left [field][i], right [field][i])) {
      if (callback)
        callback (left, right, i);
      if (left._fieldChanged)
        left._fieldChanged [field] = true;
      left [field][i] = right [field][i];
      changed = true;
    }
  });

  return changed;
};

//
//
//
exports.isNewer = isNewer;
exports.rightTimestampIsNewer = rightTimestampIsNewer;
exports.compare = mergeCompare;
exports.compareArrayOfObjects = mergeCompareArrayOfObjects;
exports.compareArray = mergeCompareArray;
