'use strict';

var _ = require ('lodash');
var fs = require ('fs');
var path = require ('path');
var pmelog = require ('./pmelog');

//
//
//
function findImageFiles (folderName) {
  var fileList = [];

  fs.readdirSync (folderName).forEach (function (file) {
    var fullName = path.join (folderName, file);
    var stat = fs.lstatSync (fullName);

    if (stat.isDirectory ()) {
      findImageFiles (fullName);
    } else if (file.match (/\.gif$|\.jpeg$|\.jpg$|\.png$/g)) {
      fullName = fullName.replace (/\\/g, '/');
      fullName = fullName.replace (/^public\//, '/');
      fileList.push ('/kiosk/vendor?image=' + fullName);
    }
  });

  return fileList.sort ();
}

function buildDivisionList (self) {
  var activeDivisions = [];

  _.each (self._accessorFunctions.getMatchdef ().getActiveDivisions (), function (d) {
    activeDivisions.push ('/kiosk/scores?kiosk=1&stage=overall&division=' + d);
    // scores2
  });

  return activeDivisions;
}

//
//
//
function buildCompleteList (self) {
  var imageList = findImageFiles ('./public/vendor');
  var divisionList = buildDivisionList (self);
  var imageIndex = 0;
  var divisionIndex = 0;
  var imageWrapped = false;
  var divisionWrapped = false;
  var list = [];

  function nextImage () {
    if (imageList.length) {
      list.push (imageList [imageIndex]);

      if (++imageIndex >= imageList.length) {
        imageIndex = 0;
        imageWrapped = true;
      }
    }
  }

  function nextDivision () {
    if (divisionList.length) {
      list.push (divisionList [divisionIndex]);

      if (++divisionIndex >= divisionList.length) {
        divisionIndex = 0;
        divisionWrapped = true;
      }
    }
  }

  function nextProgress () {
    list.push ('/kiosk/progress?kiosk=1');
  }

  if (!imageList.length)
    imageWrapped = true;
  if (!divisionList.length)
    divisionWrapped = true;

  if (imageWrapped && divisionWrapped)
    nextProgress ();

  while (!imageWrapped || !divisionWrapped) {
    nextProgress ();
    nextImage (); // FIXME: Should come from vendorImageCount
    nextImage (); // FIXME: Should come from vendorImageCount

    if (divisionList.length) {
      nextDivision ();
      nextImage (); // FIXME: Should come from vendorImageCount
      nextImage (); // FIXME: Should come from vendorImageCount
    }
  }

  return list;
}

//
//
//
function sendNextPage (self, source) {
  source = source;
  self._list = buildCompleteList (self);

  if (++self._listIndex >= self._list.length)
    self._listIndex = 0;

  return {dest: 'kiosk_page', param: {url: self._list [self._listIndex]}};
}

//
//
//
var Kiosk = function (accessorFunctions, options, callback) {
  var self = this;

  if (_.isFunction (options)) {
    callback = options;
    options = {};
  }

  options = options || {};

  self._accessorFunctions = accessorFunctions;
  self._list = {};
  self._listIndex = 0;

  if (callback)
    callback (null, self);

  return self;
};

Kiosk.prototype.className = function () {
  return 'Kiosk';
};
Kiosk.prototype.updateConfig = function () {
  return this;
};
Kiosk.prototype.start = function () {
  pmelog.llog (pmelog.INFO, 'kiosk: start');
  return this;
};
Kiosk.prototype.idle = function (req) {
  pmelog.llog (pmelog.INFO, 'kiosk: idle');
  return sendNextPage (this, req.data.name);
};
Kiosk.prototype.activity = function () {
  pmelog.llog (pmelog.INFO, 'kiosk: activity');
  return this;
};

//
//
//
exports.Kiosk = Kiosk;
