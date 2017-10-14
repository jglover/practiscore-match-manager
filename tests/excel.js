//
//  Requires 'xlsx' module to be installed. Opens file 'test.xlsx' and dumps
//  the contents in JSON.
//
'use strict';

// var lodash = require ('lodash');
var xlsx = require ('xlsx');

var workbook = xlsx.readFile ('test.xlsx');
var first_sheet_name = workbook.SheetNames [0];
var worksheet = workbook.Sheets [first_sheet_name];
// var json = xlsx.utils.sheet_to_json (worksheet);

console.log (worksheet);
