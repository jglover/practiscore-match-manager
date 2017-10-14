'use strict';

var mdns = require ('mdns');
var express = require ('express.io');
var app = express ();

mdns.createAdvertisement (mdns.tcp ('practiprint'), 49613, {txtRecord: {stage: 2, path: '/practiprint/'}}).start ();

app.get ('/', function () { return "Hello World"; });
app.listen (4321);
