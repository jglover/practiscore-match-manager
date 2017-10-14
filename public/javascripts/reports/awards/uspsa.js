/* global io, pmelib */
/* global console: false, _: false */
/* jshint devel: true */

$(function () {
  'use strict';

  var pmmui = {
    theme: $('#pmmui').attr ('theme') || 'darkblue',
  };

  $.jqx.theme = pmmui.theme;

  var App = {};

  var states = [
    { value: 'AK', label: 'Alaska' },
    { value: 'AL', label: 'Alabama' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'IA', label: 'Iowa' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MD', label: 'Maryland' },
    { value: 'ME', label: 'Maine' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MT', label: 'Montana' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NY', label: 'New York' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VA', label: 'Virginia' },
    { value: 'VT', label: 'Vermont' },
    { value: 'WA', label: 'Washington' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WY', label: 'Wyoming' },
    { value: 'GU', label: 'Guam' },
    { value: 'PR', label: 'Puerto Rico' },
    { value: 'VI', label: 'Virgin Islands' },
  ];

  var statesSource = {
    datatype: 'array',
    datafields: [
      { name: 'value', type: 'string' },
      { name: 'label', type: 'string' }
    ],
    localdata: states
  };

  var statesAdapter = new $.jqx.dataAdapter (statesSource, {
    autoBind: true
  });

  var envelopeSpec = {
    //
    //  Standard #10 letter envelope is 297pt (4.125") wide by 684pt (9.50")
    //  long (fed sideways into printer, as most printers can only handle 8.5"
    //  wide paper)
    //
    size_10: {
      envelope: {
        width:  297,
        height: 773,
        radius:   7,
      },
      format: {
        award: function (shooter) {
          return [
            { html: shooter.division, attrs: {x: '260.00pt', y: '386.5pt', 'class': 'envelopedivision' }},
            { html: shooter.place,    attrs: {x: '210.00pt', y: '386.5pt', 'class': 'envelopeclass'    }},
            { html: shooter.name,     attrs: {x:  '90.00pt', y: '386.5pt', 'class': 'envelopeshooter'  }},
          ];
        },
      },
    }
  };

  //
  //
  //
  App.renderEnvelopes = function (pv) {
    var suffixMap = ['st', 'nd', 'rd', 'th'];
    var printList = [];
    var pushEntry = function (divisionName, place, shooter) {
      printList.push ({
        division: App.matchData.l.divisions [divisionName],
        place: place,
        name: shooter.sh_fn + ' ' + shooter.sh_ln,
      });
    };

console.log (pv);
    _.each (App.awardsResults, function (division, divisionName) {
      if (pv.division.print && division.hoa)
        pushEntry (divisionName, 'High Overall', division.hoa);
      if (pv.champion.print && division.area && pv.champion.area)
        pushEntry (divisionName, 'Area ' + pv.champion.area + ' Champion', division.area);
      if (pv.champion.print && division.area && pv.champion.state)
        pushEntry (divisionName, pv.champion.state + ' State Champion', division.state);

      if (pv.class.print) {
        _.each (division.classes, function (classEntries) {
          var winners = _.filter (classEntries, 'css_class', 'win');

          _.each (winners, function (shooter, index) {
            pushEntry (divisionName, (index + 1) + suffixMap [index <= 3 ? index : 3] + ' ' + App.matchData.l.classes [shooter.sh_grd], shooter);
          });
        });
      }

      if (pv.category.print) {
        _.each (division.categories, function (categoryEntries, categoryName) {
          var winners = _.filter (categoryEntries, 'css_category_' + categoryName.toLowerCase (), 'win');

          _.each (winners, function (shooter, index) {
            var place = (!index) ? 'High ' : (index + 1) + suffixMap [index <= 3 ? index : 3];
            pushEntry (divisionName, place + ' ' + categoryName, shooter);
          });
        });
      }
    });

    pmelib.envelopeEngine (pv, printList,
      function (shooter, addEnvelopeCallback) {
        addEnvelopeCallback (pv.envelopeSpec.format.award (shooter));
      }
    );
  };

  //
  //  Run through all the stages and shooters, calculating the scores for any
  //  scores that exist. Deleted shooters should already be removed, DQed
  //  shooters and DNFs return all 0's.
  //
  App.calculateScores = function () {
    _.each (App.matchData.m.match_shooters, function (shooter) {
      shooter.spts_o = 0;
      shooter.spts_d = 0;
    });

    _.each (App.matchData.s.match_scores, function (stageScores, stageIndex) {
      var stage = App.quickFind.s [stageScores.stage_uuid];

      App.matchScoresByStage [stageIndex] = {};

      _.each (stageScores.stage_stagescores, function (score) {
        console.assert (score.shtr, 'score.shtr is null');
        if (!App.quickFind.c [score.shtr]) {
          console.error ('score.shtr %s is not in App.quickFind.c', score.shtr);
          console.dir (score);
        }
        console.assert (App.quickFind.c [score.shtr], 'score.shtr ' + score.shtr + ' is not in App.quickFind.c');
        App.matchScoresByStage [stageIndex][score.shtr] = pmelib.calculateScore (stage, score, App.quickFind.c [score.shtr]);
        console.assert (App.matchScoresByStage [stageIndex][score.shtr].shooter, 'Calculate score returned score without .shooter');
      });

      if (stage.stage_scoretype === 'Fixed') {
        App.matchData.m.match_stages [stageIndex].stage_points = _.max (App.matchScoresByStage [stageIndex], function (score) {
          return score.hf;
        }).hf;
      }

      //
      //  Calculate overall and division stage points
      //
      if (_.size (App.matchScoresByStage [stageIndex])) {
        var sortedScores = App.sortScoresByHF (App.matchScoresByStage [stageIndex]);
        var stagePoints = App.matchData.m.match_stages [stageIndex].stage_points || 0;
        var sortedScoresLength = sortedScores.length;
        var highHF;
        var highDivHF = {};
        var divPlace = {};

        _.each (sortedScores, function (score, scoreIndex) {
          highHF = highHF || score.hf;
          highDivHF [score.div] = highDivHF [score.div] || score.hf;
          divPlace [score.div] = divPlace [score.div] || 0;
          score.placeDiv = ++divPlace [score.div];
          score.placeOverall = scoreIndex + 1;
          score.placeOverallOf = sortedScoresLength;

          console.assert (score.shooter, 'score.shooter is null');
          if (highHF) {
            score.spct_o = (Math.round (score.hf * 10000) / 10000) / (Math.round (highHF * 10000) / 10000);
            score.spts_o = Math.round ((stagePoints * score.spct_o) * 10000) / 10000;

            App.quickFind.c [score.shooter].spts_o += score.spts_o;
          }
          if (highDivHF [score.div]) {
            score.spct_d = (Math.round (score.hf * 10000) / 10000) / (Math.round (highDivHF [score.div] * 10000) / 10000);
            score.spts_d = Math.round ((stagePoints * score.spct_d) * 10000) / 10000;
            App.quickFind.c [score.shooter].spts_d += score.spts_d;
          }
        });

        _.each (sortedScores, function (score) {
          score.placeDivOf = divPlace [score.div];
        });
      }
    });

    //
    //  Overall and division stage points calculated, now calculate
    //  percentages. This are used for displaying combined results.
    //
    {
      var highHF;

      App.matchScoresCombined.overall = _.sortBy (App.matchData.m.match_shooters, function (shooter) {
        if (shooter.sh_dq)
          return -3.0;

        return (shooter.spts_o);
      }).reverse ();

      var numShooters = App.matchScoresCombined.overall.length;

      _.each (App.matchScoresCombined.overall, function (shooter, shooterIndex) {
        shooter.placeOverall = shooterIndex + 1;
        shooter.placeOverallOf = numShooters;
        highHF = highHF || shooter.spts_o;

        if (highHF)
          shooter.spct_o = shooter.spts_o / highHF;
      });
    }

    {
      _.each (App.matchDivisions, function (d) {
        var highHF;

        App.matchScoresCombined [d] = _.sortBy (_.filter (App.matchData.m.match_shooters, 'sh_dvp', d), function (shooter) {
          if (shooter.sh_dq)
            return -3.0;

          return (shooter.spts_d);
        }).reverse ();

        var numShooters = App.matchScoresCombined [d].length;

        _.each (App.matchScoresCombined [d], function (shooter, shooterIndex) {
          shooter.placeDiv = shooterIndex + 1;
          shooter.placeDivOf = numShooters;
          highHF = highHF || shooter.spts_d;

          if (highHF)
            shooter.spct_d = shooter.spts_d / highHF;
        });
      });
    }
  };

  //
  //
  //
  App.sortScoresByHF = function (scores) {
    var sortedScores = _.sortBy (scores, function (score) {
      if (score.dq)
        return -3.0;
      if (score.dnf)
        return -2.0;
      if ((score.time === 0.0) && (score.hf === 0.0))
        return -1.0;

      return score.hf;
    });

    return sortedScores.reverse ();
  };

  App.buildAwards = function (pv) {
    _.each (App.matchDivisions, function (division) {
      var divisionScores = App.matchScoresCombined [division];
      var awards = {
        classes: {},
        categories: {},
        hoa: null,
        area: null,
        state: null,
      };

      if (divisionScores.length >= pv.division.minimumEntries) {
        awards.hoa = _.first (divisionScores);

        if (pv.matchLevel === 'l3')
          awards.area = _.find (divisionScores, function (shooter) {
            return (shooter.sh_area === pv.champion.area) && !shooter.sh_dq;
          });
        if (pv.matchLevel === 'l2')
          awards.state = _.find (divisionScores, function (shooter) {
            return (shooter.sh_st === pv.champion.state) && !shooter.sh_dq;
          });
      }

      //
      //  Process the class awards for this division
      //
      _.each (['G', 'M', 'A', 'B', 'C', 'D', 'U'], function (classs) {
        awards.classes [classs] = _.filter (divisionScores, 'sh_grd', classs);
        if ((!pv.class.ignoreDivisionMinimum && (divisionScores.length < pv.division.minimumEntries)) ||
            (pv.class.ignoreDivisionMinimum && (awards.classes [classs].length < pv.class.minimumEntries))) {
          _.each (awards.classes [classs], function (shooter) {
            shooter.css_class = shooter.sh_dq ? 'dq' : 'strike-toofew';
          });
        } else if (awards.classes [classs].length) {
          var shootersInClass = awards.classes [classs].length;
          var numberOfPlaces = pv.class.awardStep.length;
          var place = 0;
          var hoa = null;

          if (awards.hoa)
            if (awards.classes [classs][0].sh_uid === awards.hoa.sh_uid) {
              hoa = awards.classes [classs].shift ();
              awards.classes [classs].push (hoa);
            }

          _.each (awards.classes [classs], function (shooter) {
            if (shooter.sh_dq)
              shooter.css_class = 'dq';
            else if ((place >= numberOfPlaces) || (shootersInClass < pv.class.awardStep [place]))
              shooter.css_class = 'strike-no-win';
            else {
              shooter.css_class = 'win';
              place++;
            }
          });

          if (hoa) {
            awards.classes [classs].pop ();
            awards.classes [classs].unshift (hoa);
            hoa.css_class = (hoa.css_class === 'dq') ? 'dq' : 'skip';
          }
        }
      });

      //
      //  Process the category awards for this division
      //
      _.each (App.matchData.m.match_ctgs, function (ctg) {
        awards.categories [ctg] = _.filter (divisionScores, function (shooter) {
          return _.contains (shooter.sh_ctgs, ctg);
        });
        if ((!pv.category.ignoreDivisionMinimum && (divisionScores.length < pv.division.minimumEntries)) ||
            (pv.category.ignoreDivisionMinimum && (awards.categories [ctg].length < pv.category.minimumEntries))) {
          _.each (awards.categories [ctg], function (shooter) {
            shooter ['css_category_' + ctg.toLowerCase ()] = shooter.sh_dq ? 'dq' : 'strike-toofew';
          });
        } else if (awards.categories [ctg].length) {
          var shootersInCategory = awards.categories [ctg].length;
          var numberOfPlaces = pv.category.awardStep.length;
          var place = 0;

          _.each (awards.categories [ctg], function (shooter) {
            if (shooter.sh_dq)
              shooter ['css_category_' + ctg.toLowerCase ()] = 'dq';
            else if ((place >= numberOfPlaces) || (shootersInCategory < pv.category.awardStep [place]))
              shooter ['css_category_' + ctg.toLowerCase ()] = 'strike-no-win';
            else {
              shooter ['css_category_' + ctg.toLowerCase ()] = 'win';
              place++;
            }
          });
        }
      });

      App.awardsResults [division] = awards;
    });
  };

  //
  //
  //
  App.putPageBreak = function () {
    var fragment = document.createDocumentFragment ();
    var divnp = document.createElement ('div');
    var divpb = document.createElement ('div');
    var hr    = document.createElement ('hr');

    divnp.setAttribute ('section', 'header-rule');
    divnp.className = 'no-print';
    divnp.appendChild (hr);

    divpb.setAttribute ('section', 'page-break');
    divpb.className = 'page-break';

    fragment.appendChild (divnp);
    fragment.appendChild (divpb);

    return fragment;
  };

  App.putHeader = function (title) {
    var div = document.createElement ('div');
    var h2  = document.createElement ('h2');

    App.tocLinks = App.tocLinks || [];
    App.tocLinks.push ({section: App.tocLinks.length + 1, title: title});

    h2.id = 'section' + App.tocLinks.length;

    h2.className = 'title';
    h2.innerHTML = title;

    div.setAttribute ('section', 'header');
    div.className = 'nobreak';
    div.appendChild (h2);

    return div;
  };

  //
  //
  //
  App.shootersTable = function (shooters, options) {
    var fragment = document.createDocumentFragment ();
    var divnb = document.createElement ('div');
    var div   = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');

    var trHeader = function () {
      var th;
      var tr = document.createElement ('tr');
      var headers = ['Place', 'Name', 'State', 'Class', 'Age', 'Fem', 'Mil', 'Law'];

      if (options.noPlace)
        headers.shift ();

      _.each (headers, function (item) {
        th = document.createElement ('th');
        th.className = 'results_' + item.toLowerCase ();
        th.innerHTML = item;
        tr.appendChild (th);
      });

      return tr;
    };

    var trShooter = function (place, shooter) {
      var tr = document.createElement ('tr');

      var tdAdd = function (tdData) {
        var td = document.createElement ('td');
        td.innerHTML = tdData;
        tr.appendChild (td);
      };

      if (!options.noPlace)
        tdAdd (place);

      tdAdd (shooter.sh_fn + ' ' + shooter.sh_ln);
      tdAdd (shooter.sh_st);
      tdAdd (App.matchData.l.classes [shooter.sh_grd]);
      tdAdd ((shooter.sh_age !== 'ADULT') ? App.matchData.l.ages [shooter.sh_age] : '-');
      tdAdd ((shooter.sh_gen === 'FEMALE') ? 'Fem' : '-');
      tdAdd (shooter.sh_mil ? 'Mil' : '-');
      tdAdd (shooter.sh_law ? 'Law' : '-');

      return tr;
    };

    options = options || {};

    if (!shooters.length)
      return divnb;

    _.each (shooters, function (shooter, index) {
      fragment.appendChild (trShooter (index + 1, shooter));
    });

    thead.appendChild (trHeader ());
    tbody.appendChild (fragment);
    table.appendChild (thead);
    table.appendChild (tbody);

    div.className = 'results';
    div.appendChild (table);

    divnb.className = 'nobreak';
    divnb.appendChild (div);

    return divnb;
  };

  App.oneEntryTable = function (shooter, options) {
    return App.shootersTable (new Array (shooter), _.merge ((options || {}), {noPlace: true}));
  };

  App.classTable = function (shooters, options) {
    return App.shootersTable (shooters, options);
  };

  App.categoryTable = function (category, shooters, options) {
    var fragment = document.createDocumentFragment ();
    var divnb = document.createElement ('div');
    var div   = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');

    var trHeader = function () {
      var th;
      var tr = document.createElement ('tr');
      var headers = ['Place', 'Name', 'State', 'Class', 'Category'];

      if (options.noPlace)
        headers.shift ();

      _.each (headers, function (item) {
        th = document.createElement ('th');
        th.className = 'results_' + item.toLowerCase ();
        th.innerHTML = item;
        tr.appendChild (th);
      });

      return tr;
    };

    var trShooter = function (place, shooter) {
      var tr = document.createElement ('tr');

      var tdAdd = function (tdData) {
        var td = document.createElement ('td');
        td.innerHTML = tdData;
        tr.appendChild (td);
      };

      if (!options.noPlace)
        tdAdd (place);

      tdAdd (shooter.sh_fn + ' ' + shooter.sh_ln);
      tdAdd (shooter.sh_st);
      tdAdd (App.matchData.l.classes [shooter.sh_grd]);
      tdAdd (category);

      return tr;
    };

    if (!shooters.length)
      return divnb;

    _.each (shooters, function (shooter, index) {
      fragment.appendChild (trShooter (index + 1, shooter));
    });

    thead.appendChild (trHeader ());
    tbody.appendChild (fragment);
    table.appendChild (thead);
    table.appendChild (tbody);

    div.className = 'results';
    div.appendChild (table);

    divnb.className = 'nobreak';
    divnb.appendChild (div);

    return divnb;
  };

  //
  //
  //
  App.consoleOutputHOA = function (pv, divisionName, hoa) {
    if (pv.console && hoa) {
      console.log ('  Division Winner (Overall):');
      console.log ('    %s %s (%s)', hoa.sh_fn, hoa.sh_ln, App.matchData.l.classes [hoa.sh_grd]);
    }
  };

  App.consoleOutputArea = function (pv, divisionName, area) {
    if (pv.console && (pv.matchLevel === 'l3') && area) {
      console.log ('  Area Winner:');

      if (area)
        console.log ('    %s %s (%s)', area.sh_fn, area.sh_ln, App.matchData.l.classes [area.sh_grd]);
      else
        console.log ('    No in-area winner');
    }
  };

  App.consoleOutputState = function (pv, divisionName, state) {
    if (pv.console && (pv.matchLevel === 'l2') && state) {
      console.log ('  State Winner:');

      if (state)
        console.log ('    %s %s (%s)', state.sh_fn, state.sh_ln, App.matchData.l.classes [state.sh_grd]);
      else
        console.log ('    No in-state winner');
    }
  };

  App.consoleOutputClass = function (pv, className, classEntries) {
    if (pv.console) {
      if (classEntries.length === 0)
        console.log ('  %s Class has no entries', className);
      else  {
        console.log ('  %s Class Winners (%s in class, %s with wins)', className, classEntries.length, _.filter (classEntries, 'css_class', 'win').length);
        _.each (classEntries, function (shooter, index) {
          console.log ('    %d: %s %s (%s)', index + 1, shooter.sh_fn, shooter.sh_ln, shooter.css_class || 'none');
        });
      }
    }
  };

  App.consoleOutputCategory  = function (pv, categoryName, categoryEntries) {
    if (pv.console) {
      if (categoryEntries.length === 0)
        console.log ('  %s Category has no entries', categoryName);
      else {
        console.log ('  %s Category Winners (%s in category, %s with wins)', categoryName, categoryEntries.length, _.filter (categoryEntries, 'css_category_' + categoryName.toLowerCase (), 'win').length);
        _.each (categoryEntries, function (shooter, index) {
          console.log ('    %d: %s %s (%s)', index + 1, shooter.sh_fn, shooter.sh_ln, shooter ['css_category_' + categoryName.toLowerCase ()] || 'none');
        });
      }
    }
  };

  //
  //
  //
  App.displayDivisionHOA = function (pv, divisionName, shooter) {
    var div = document.createElement ('div');

    if (!pv.division.print)
      return div;

    div.setAttribute ('section', divisionName.replace (/ /g, '').toLowerCase () + '-winner-high-overall');
    div.className = 'nobreak';

    if (!shooter && pv.suppressNoQualifying)
      return div;

    div.appendChild (App.putHeader ('High Overall ' + divisionName + ' Division Winner'));

    if (shooter)
      div.appendChild (App.oneEntryTable (shooter));
    else {
      var p = document.createElement ('p');

      p.className = 'noentries';
      p.innerHTML = '(No qualifying entries)';
      div.appendChild (p);
    }

    App.consoleOutputHOA (pv, divisionName, shooter);

    return div;
  };

  App.displayDivisionArea = function (pv, divisionName, area, shooter) {
    var div = document.createElement ('div');

    if (!pv.champion.print)
      return div;

    div.setAttribute ('section', divisionName.replace (/ /g, '').toLowerCase () + '-winner-area');
    div.className = 'nobreak';

    if (!area || (!shooter && pv.suppressNoQualifying))
      return div;

    div.appendChild (App.putHeader ('Area ' + area + ' ' + divisionName + ' Division Champion'));

    if (shooter)
      div.appendChild (App.oneEntryTable (shooter));
    else {
      var p = document.createElement ('p');

      p.className = 'noentries';
      p.innerHTML = '(No qualifying entries)';
      div.appendChild (p);
    }

    App.consoleOutputArea (pv, divisionName, shooter);

    return div;
  };

  App.displayDivisionState = function (pv, divisionName, state, shooter) {
    var div = document.createElement ('div');

    if (!pv.champion.print)
      return div;

    div.setAttribute ('section', divisionName.replace (/ /g, '').toLowerCase () + '-winner-state');
    div.className = 'nobreak';

    if (!state || (!shooter && pv.suppressNoQualifying))
      return div;

    div.appendChild (App.putHeader (state + ' State ' + divisionName + ' Division Champion'));

    if (shooter)
      div.appendChild (App.oneEntryTable (shooter));
    else {
      var p = document.createElement ('p');

      p.className = 'noentries';
      p.innerHTML = '(No qualifying entries)';
      div.appendChild (p);
    }

    App.consoleOutputState (pv, divisionName, shooter);

    return div;
  };

  App.displayDivisionClasses = function (pv, divisionName, classes) {
    var div;
    var p;
    var sectionDiv = document.createElement ('div');
    var hasOutput = false;

    if (!pv.class.print)
      return sectionDiv;

    sectionDiv.setAttribute ('section', divisionName.replace (/ /g, '').toLowerCase () + '-class-winners');
    sectionDiv.className = 'nobreak';

    _.each (classes, function (classEntries, classNameShort) {
      var className = App.matchData.l.classes [classNameShort] || '** Unknown **';
      var winners = _.filter (classEntries, 'css_class', 'win');

      if (winners.length) {
        div = document.createElement ('div');
        div.setAttribute ('section', divisionName.replace (/ /g, '').toLowerCase () + '-class-winner-' + classNameShort.toLowerCase ());
        div.className = 'nobreak';
        div.appendChild (App.classTable (winners));

        if (!hasOutput)
          sectionDiv.appendChild (App.putHeader (divisionName + ' Division Winners, By Class'));

        sectionDiv.appendChild (div);

        hasOutput = true;
      }

      App.consoleOutputClass (pv, className, classEntries);
    });

    if (!hasOutput && !pv.suppressNoQualifying) {
      div = document.createElement ('div');
      p = document.createElement ('p');

      p.className = 'noentries';
      p.innerHTML = '(No qualifying entries)';
      div.appendChild (p);
      sectionDiv.appendChild (App.putHeader (divisionName + ' Division Winners, By Class'));
      sectionDiv.appendChild (div);
    }

    return sectionDiv;
  };

  App.displayDivisionCategories = function (pv, divisionName, categories) {
    var div;
    var p;
    var sectionDiv = document.createElement ('div');
    var hasOutput = false;

    if (!pv.category.print)
      return sectionDiv;

    sectionDiv.setAttribute ('section', divisionName.replace (/ /g, '').toLowerCase () + '-category-winner');
    sectionDiv.className = 'nobreak';

    _.each (categories, function (categoryEntries, categoryName) {
      var winners = _.filter (categoryEntries, 'css_category_' + categoryName.toLowerCase (), 'win');

      if (winners.length) {
        div = document.createElement ('div');
        div.setAttribute ('section', divisionName.replace (/ /g, '').toLowerCase () + '-category-winner-' + categoryName.toLowerCase ());
        div.className = 'nobreak';
        div.appendChild (App.categoryTable (categoryName, winners, {noPlace: (pv.category.maximumAwards <= 1)}));

        if (!hasOutput)
          sectionDiv.appendChild (App.putHeader (divisionName + ' Category Winners'));

        sectionDiv.appendChild (div);

        hasOutput = true;
      }

      App.consoleOutputCategory (pv, categoryName, categoryEntries);
    });

    if (!hasOutput && !pv.suppressNoQualifying) {
      div = document.createElement ('div');
      p = document.createElement ('p');

      p.className = 'noentries';
      p.innerHTML = '(No qualifying entries)';
      div.appendChild (p);
      sectionDiv.appendChild (App.putHeader (divisionName + ' Category Winners'));
      sectionDiv.appendChild (div);
    }

    return sectionDiv;
  };

  //
  //
  //
  App.displayTocLinks = function () {
    var div   = document.createElement ('div');
    var h2    = document.createElement ('h2');
    var table = document.createElement ('table');
    var hr    = document.createElement ('hr');
    var p     = document.createElement ('p');

    _.each (App.tocLinks, function (tl) {
      var tr = document.createElement ('tr');
      var td = document.createElement ('td');
      var a  = document.createElement ('a');

      a.innerHTML = tl.title;
      a.href = '#section' + tl.section;
      td.appendChild (a);
      tr.appendChild (td);
      table.appendChild (tr);
    });

    table.className = 'toc';

    h2.className = 'title';
    h2.innerHTML = 'Table of Contents';

    div.setAttribute ('section', 'toc');
    div.className = 'no-print';
    div.appendChild (h2);
    div.appendChild (table);
    div.appendChild (p);
    div.appendChild (hr);

    return div;
  };

  App.displayMatchInfo = function (pv) {
    var divnb  = document.createElement ('div');
    var divbr  = document.createElement ('div');
    var br     = document.createElement ('br');
    var h1Name = document.createElement ('h1');
    var h1Club = document.createElement ('h1');
    var h1Date = document.createElement ('h1');
    var h1Code = document.createElement ('h1');

    divbr.appendChild (br);

    h1Name.innerHTML = pv.matchName;
    h1Club.innerHTML = pv.clubName;
    h1Date.innerHTML = pv.matchDate;
    h1Code.innerHTML = pv.clubCode;

    divnb.setAttribute ('section', 'title-page');
    divnb.className = 'no-break';
    divnb.appendChild (divbr);
    divnb.appendChild (h1Name);
    divnb.appendChild (h1Club);
    divnb.appendChild (h1Date);
    divnb.appendChild (h1Code);
    divnb.appendChild (divbr);
    divnb.appendChild (divbr);
    divnb.appendChild (divbr);
    divnb.appendChild (divbr);

    return divnb;
  };

  App.displayConfig = function (pv) {
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var p = document.createElement ('p');
    var addToTable = function (desc, value) {
      var tr = document.createElement ('tr');
      var tdl = document.createElement ('td');
      var tdr = document.createElement ('td');

      tdl.className = 'config_l';
      tdl.innerHTML = desc;
      tdr.className = 'config_r';
      tdr.innerHTML = value;

      tr.appendChild (tdl);
      tr.appendChild (tdr);
      table.appendChild (tr);
    };

    var mapPosition = function (arr) {
      var temp = [];
      _.each (arr, function (n, index) {
        var i = index + 1;
        var t = i % 10;
        var s = '';
        if ((index > 0) && (index % 5 === 0))
          s = '<br>' + s;
        if (t === 1)
          s += i + 'st=' + n;
        else if (t === 2)
          s += i + 'nd=' + n;
        else if (t === 3)
          s += i + 'rd=' + n;
        else
          s += i + 'th=' + n;
        temp.push (s);
      });
      return temp.join (',');
    };

    table.className = 'config';

    addToTable ('Entries required per division:', pv.division.minimumEntries);
    addToTable ('&nbsp;', '&nbsp');

    if (pv.class.print) {
      addToTable ('Entries required per class:', pv.class.minimumEntries);
      addToTable ('Competitors required per position:', mapPosition (pv.class.awardStep));
      addToTable ('Awards per class:', pv.class.maximumAwards);
      addToTable ('&nbsp;', '&nbsp');
    }

    if (pv.category.print) {
      addToTable ('Entries required per category:', pv.category.minimumEntries);
      addToTable ('Competitors required per position:', mapPosition (pv.category.awardStep));
      addToTable ('Awards per category:', pv.category.maximumAwards);
    }

    div.setAttribute ('section', 'config');
    div.className = 'nobreak';
    div.appendChild (App.putHeader ('Configuration Settings'));
    div.appendChild (table);
    div.appendChild (p);
    div.appendChild (App.putPageBreak ());

    return div;
  };

  //
  //
  //
  App.displayPagePresentation = function (pv) {
    var bodyFragment = document.createDocumentFragment ();
    var tocFragment = document.createDocumentFragment ();
    var matchFragment = document.createDocumentFragment ();
    var configFragment = document.createDocumentFragment ();
    var resultsFragment = document.createDocumentFragment ();

    //
    //  Config must come before others so TOC link gets pushed correctly
    //
    matchFragment.appendChild (App.displayMatchInfo (pv));
    configFragment.appendChild (App.displayConfig (pv));

    _.each (App.awardsResults, function (division, divisionName) {
      var divisionNameNice = App.matchData.l.divisions [divisionName];
      var divisionFragment = document.createDocumentFragment ();

      if (pv.console)
        console.log ('%s Division:', divisionNameNice);

      divisionFragment.appendChild (App.displayDivisionHOA (pv, divisionNameNice, division.hoa));
      divisionFragment.appendChild (App.displayDivisionArea (pv, divisionNameNice, pv.champion.area, division.area));
      divisionFragment.appendChild (App.displayDivisionState (pv, divisionNameNice, pv.champion.state, division.state));
      divisionFragment.appendChild (App.displayDivisionClasses (pv, divisionNameNice, division.classes));
      divisionFragment.appendChild (App.displayDivisionCategories (pv, divisionNameNice, division.categories));

      if (divisionFragment.textContent.length)
        divisionFragment.appendChild (App.putPageBreak ());

      resultsFragment.appendChild (divisionFragment);
    });

    //
    //  Must be done last so that all TOC links are in App.tocLinks[]
    //
    tocFragment.appendChild (App.displayTocLinks ());

    //
    //  And this is the actual order we display them in
    //
    bodyFragment.appendChild (tocFragment);
    bodyFragment.appendChild (matchFragment);
    bodyFragment.appendChild (configFragment);
    bodyFragment.appendChild (resultsFragment);

    //
    //  Section ID's are assigned to the h2 element, for convenience. Move them
    //  to the parent div that encloses the whole section.
    //
    $('[id^=section]', $(bodyFragment)).each (function () {
      $(this).parent ().parent ().attr ('id', $(this).attr ('id'));
      $(this).removeAttr ('id');
    });

    $('#awards').empty ().append (bodyFragment);
  };

  App.displayPageEnvelopes = function (pv) {
    pv.section = '#awards';
    App.renderEnvelopes (pv);
  };

  App.displayPageCGC = function (pv) {
    var bodyFragment = document.createDocumentFragment ();
    var pre = document.createElement ('pre');
    var text = '';
    var suffixMap = ['st', 'nd', 'rd'];
    var payMap = ['$15.00', '$10.00', '$5.00'];
    var rows = [];

    if (pv.matchLevel !== 'l1') {
      alert ('This format is only suitable for a Level-I match!');
      return;
    }

    _.each (App.awardsResults, function (division, divisionName) {
      var niceDivisionName = App.matchData.l.divisions [divisionName];

      if (division.hoa)
        rows.push ({
          name: division.hoa.sh_ln + ', ' + division.hoa.sh_fn,
          division: niceDivisionName,
          place: 'Match Winner',
          prize: 'Free Match',
        });

      _.each (division.classes, function (classEntries, classNameShort) {
        var className = App.matchData.l.classes [classNameShort] || '** Unknown **';
        var winners = _.filter (classEntries, 'css_class', 'win');

        _.each (winners, function (winner, index) {
          rows.push ({
            name: winner.sh_ln + ', ' + winner.sh_fn,
            division: niceDivisionName,
            place: (index + 1) + suffixMap [index % 10] + ' ' + className,
            prize: payMap [index],
          });
        });
      });
    });

    if (true) {
      _.each (_.sortBy (rows, 'name'), function (v) {
        text += v.name + '\t' + v.division + '\t' + v.place + '\t'  + v.prize + '\n';
      });
      text += '------------------------------\n';
      text += 'Highlight the text above the line, then right-click and select \'Copy\'.\n';
      text += 'In LibreCalc, right-click in the cell and select \'Paste special...\'\n';
      text += 'Select \'Unformatted text\', and click \'OK\'. Confirm that the \'Separated by\'\n';
      text += 'radio button is selected, and that only the \'Tab\' checkbox is selected.\n';
      text += 'Click \'OK\' to paste the text into the spreadsheet.\n';

      pre.className = 'cgc';
      pre.innerHTML = text;
      bodyFragment.appendChild (pre);
    }

    //
    //  Disabled for now. For some reason, you just can't seem to copy'n'paste
    //  HTML into Libre Calc, and have it format correctly.
    //
    if (false) {
      var div = document.createElement ('div');
      var table = document.createElement ('table');
      var thead = document.createElement ('thead');
      var tbody = document.createElement ('tbody');
      var th = document.createElement ('th');
      var tr = document.createElement ('tr');
      var td;

      th.innerHTML = 'August 12th';
      th.colSpan = 4;

      tr.appendChild (th);
      thead.appendChild (tr);

      _.each (_.sortBy (rows, 'name'), function (v) {
        tr = document.createElement ('tr');

        _.each (['name', 'division', 'place', 'prize'], function (f) {
          td = document.createElement ('td');

          td.innerHTML = v [f];
          td.className = f;
          tr.appendChild (td);
        });

        tbody.appendChild (tr);
      });

      table.className = 'cgc';
      table.appendChild (thead);
      table.appendChild (tbody);

      div.className = 'cgc';
      div.appendChild (table);

      bodyFragment.appendChild (div);
    }

    $('#awards').empty ().append (bodyFragment);
  };

  App.displayPage = function (pv) {
    switch (pv.outputFormat) {
      case 'presentation' :
        App.displayPagePresentation (pv);
        break;
      case 'envelopes' :
        App.displayPageEnvelopes (pv);
        break;
      case 'cgc' :
        App.displayPageCGC (pv);
        break;
      default :
        alert ('Unhandled output format \'' + pv.outputFormat + '\'');
        break;
    }
  };

  //
  //
  //
  App.errorMessage = function (msg) {
    var p = document.createElement ('p');
    p.innerHTML = msg;
    p.id = 'errorMessage';
    $('#awards').empty ().append (p).show ();
  };

  //
  //
  //
  App.displayAwards = function (pv, matchData) {
    if (!matchData || !matchData.m || !matchData.m.match_shooters || !matchData.m.match_shooters.length)
      return App.errorMessage ('Nothing to do, no competitors present!');

    if (!matchData || !matchData.m || !matchData.m.match_stages || !matchData.m.match_stages.length)
      return App.errorMessage ('Nothing to do, no stages defined!');

    if (!matchData || !matchData.s || !matchData.s.match_scores || !matchData.s.match_scores.length)
      return App.errorMessage ('Nothing to do, no scores present!');

    App.matchData = matchData;

    //
    //  Re-init variables so we don't get accumulating TOC links, etc
    //
    App.matchDivisions = {};
    App.matchScoresCombined = {};
    App.matchScoresByStage = [];
    App.quickFind = {};
    App.awardsResults = {};
    App.tocLinks = [];

    if (pv.sortCategories)
      App.matchData.m.match_ctgs = _.sortBy (App.matchData.m.match_ctgs, function (k) {return k;});

    pmelib.removeDeletedShooters (matchData);
    pmelib.removeDeletedStages (matchData);
    App.matchDivisions = pmelib.getMatchDivisions (matchData);
    App.quickFind = pmelib.createQuickFindList (matchData);
    App.calculateScores ();
    App.buildAwards (pv);
    App.displayPage (pv);

    App.socket.emit ('utils:jcw:mailing', {awards: App.awardsResults});
  };

  //
  //
  //
  App.saveAwardsSettings = function () {
    var settings = {};

    $('[settings-save]').each (function () {
      var id = $(this).attr ('id');
      var controltype = $(this).attr ('controltype');

      if (controltype === 'checkbox')
        settings [id] = $(this).jqxCheckBox ('checked');
      else if (controltype === 'radiobutton')
        settings [id] = $(this).jqxRadioButton ('checked');
      else if (controltype === 'numberinput')
        settings [id] = $(this).jqxNumberInput ('val');
      else if (controltype === 'textinput')
        settings [id] = $(this).jqxInput ('val');
      else if (controltype === 'dropdownlist') {
        if ($(this).jqxDropDownList ('getSelectedItem'))
          settings [id] = $(this).jqxDropDownList ('getSelectedItem').value;
      } else {
        console.log ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or textinput!', id);
        alert ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or textinput!', id);
      }
    });

    App.socket.emit ('settings:awards:save', {
      uuid: App.matchData.m.match_id,
      settings: settings,
    }, function (data) {
      if (data.err) {
        console.log ('Error saving awards settings: ' + data.err);
        alert ('Error saving awards settings: ' + data.err);
      }
    });

    return settings;
  };

  App.loadAwardsSettings = function (savedVars) {
    _.each (savedVars, function (value, id) {
      var controltype = id.match (/^(\w+)-?/) [1];

      if (controltype === 'checkbox')
        $('#' + id).jqxCheckBox ({checked: value});
      else if (controltype === 'radiobutton')
        $('#' + id).jqxRadioButton ({checked: value});
      else if (controltype === 'numberinput')
        $('#' + id).jqxNumberInput ('val', value);
      else if (controltype === 'textinput')
        $('#' + id).jqxInput ('val', value);
      else if (controltype === 'dropdownlist') {
        if (value)
          $('#' + id).val (value);
      } else {
        console.log ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or textinput!', id);
        alert ('Eeek! ' + id + ' isn\'t checkbox, radiobutton, numberinput, or textinput!', id);
      }
    });
  };

  App.getMatchLevel = function () {
    return $('#radiobutton-match-level-l4').jqxRadioButton ('checked') ? 'l4' :
           $('#radiobutton-match-level-l3').jqxRadioButton ('checked') ? 'l3' :
           $('#radiobutton-match-level-l2').jqxRadioButton ('checked') ? 'l2' :
           $('#radiobutton-match-level-l1').jqxRadioButton ('checked') ? 'l1' : 'l1';
  };

  App.updatePrintVariables = function () {
    var pv = {};
    var matchLevel = App.getMatchLevel ();

    pv.matchLevel = matchLevel;
    pv.sortCategories = false;
    pv.console = false;

    pv.matchName = App.matchData.m.match_name;
    pv.matchDate = App.matchData.m.match_date;
    pv.clubName  = $('#textinput-club-name').jqxInput ('val');
    pv.clubCode  = $('#textinput-club-code').jqxInput ('val');

    _.each (['champion', 'division', 'class', 'category'], function (item) {
      var step;
      var places;
      var levelItem = matchLevel + '-' + item;

      pv [item] = pv [item] || {};

      $('#checkbox-' + matchLevel + '-print-' + item).each (function () {
        pv [item].print = $(this).jqxCheckBox ('checked');
      });

      $('#numberinput-' + levelItem + '-minimum-entries').each (function () {
        pv [item].minimumEntries = $(this).jqxNumberInput ('val');
      });

      $('#checkbox-' + levelItem + '-ignore-division-minimum').each (function () {
        pv [item].ignoreDivisionMinimum = $(this).jqxCheckBox ('checked');
      });

      $('#numberinput-' + levelItem + '-award-step').each (function () {
        step =  $('#numberinput-' + levelItem + '-award-step').jqxNumberInput ('val');
        places = $('#numberinput-' + levelItem + '-maximum-awards').jqxNumberInput ('val');
        pv [item].awardStep = _.times (places, function (n) { return (n + 1) * step; });

        $('#radiobutton-' + levelItem + '-award-step-custom').each (function () {
          if ($(this).jqxRadioButton ('checked')) {
            pv [item].awardStep = [];
            _.each ($('#textinput-' + levelItem + '-award-step-custom').jqxInput ('val').trim ().replace (/,+/g, ',').replace (/^,|,+$/g, '').split (','), function (v, index) {
              pv [item].awardStep [index] = parseInt (v);
            });
          }
        });

        pv [item].maximumAwards = pv [item].awardStep.length;
      });
    });

    $('#numberinput-' + matchLevel + '-area-number').each (function () {
      pv.champion.area = $(this).jqxNumberInput ('val');
    });

    $('#dropdownlist-' + matchLevel + '-state-tla').each (function () {
      if ($(this).jqxDropDownList ('getSelectedItem'))
        pv.champion.state = $(this).jqxDropDownList ('getSelectedItem').value;
    });

    pv.outputFormat = $('#radiobutton-outputformat-presentation').jqxRadioButton ('checked') ? 'presentation' :
                      $('#radiobutton-outputformat-envelopes').jqxRadioButton ('checked') ? 'envelopes' :
                      $('#radiobutton-outputformat-cgc').jqxRadioButton ('checked') ? 'cgc' :
                      'presentation';

    pv.suppressNoQualifying = $('#checkbox-suppress-noqualifying').jqxCheckBox ('checked');

    pv.envelopeType = 'size_10';
    pv.envelopeSpec = envelopeSpec [pv.envelopeType];
    pv.showEnvelopeOutline = false;

    if (pv.console)
      console.dir (pv);

    App.saveAwardsSettings ();

    return pv;
  };

  App.updateButtonStates = function () {
    var printEnabled = false;
    var matchLevel = App.getMatchLevel ();

    //
    // Yeah, Cherokee is special :)
    //
    if ($('#radiobutton-outputformat-cgc').jqxRadioButton ('checked')) {
      matchLevel = 'l1';
      $('#radiobutton-match-level-l1').jqxRadioButton ('checked', true);
      $('#numberinput-l1-division-minimum-entries').jqxNumberInput ('val', 5);
      $('#checkbox-l1-print-division').jqxCheckBox ('checked', true);
      $('#checkbox-l1-print-class').jqxCheckBox ('checked', true);
      $('#checkbox-l1-class-ignore-division-minimum').jqxCheckBox ('checked', true);
      $('#numberinput-l1-class-minimum-entries').jqxNumberInput ('val', 3);
      $('#radiobutton-l1-class-award-step-custom').jqxRadioButton ('checked', true);
      $('#textinput-l1-class-award-step-custom').jqxInput ('val', '3,7,11');
      $('#checkbox-l1-print-category').jqxCheckBox ('checked', false);
      $('#checkbox-suppress-noqualifying').jqxCheckBox ('checked', true);
    }

    $('[match-level]').not ('[match-level=' + matchLevel + ']').hide ();
    $('[match-level=' + matchLevel + ']').show ();

    _.each (['l4', 'l3', 'l2', 'l1'], function (level) {
      _.each (['champion', 'class', 'category'], function (item) {
        var levelItem = level + '-' + item;

        if (!$('[' + levelItem + '-award-step-fixed]').length) {
          $('#radiobutton-' + levelItem + '-award-step-normal').each (function () {
            var normal = $(this).jqxRadioButton ('checked');
            var selector = 'div[match-level=' + level + '] [' + item + '-step';

            $(selector + '-normal-disable]').jqxNumberInput ('disabled', !normal);
            $(selector + '-custom-disable]').jqxInput ('disabled', normal);
            $(selector + '-normal-fade]').css ({opacity:  normal ? 1.0 : 0.55});
            $(selector + '-custom-fade]').css ({opacity: !normal ? 1.0 : 0.55});
          });
        }

        $('div[match-level=' + level + '] [no-' + item + '-hide]').each (function () {
          $(this).toggle ($('#checkbox-' + level + '-print-' + item).jqxCheckBox ('checked'));
        });
      });
    });

    if (!$('#textinput-club-name').jqxInput ('val').length)
      $('#textinput-club-name').jqxInput ('val', App.matchData.m.match_clubname || '');
    if (!$('#textinput-club-code').jqxInput ('val').length)
      $('#textinput-club-code').jqxInput ('val', App.matchData.m.match_clubcode || '');

    $('[id^=checkbox-' + matchLevel + '-print-').each (function () {
      printEnabled |= $(this).jqxCheckBox ('checked');
    });

    $('[no-sections-disable]').jqxRadioButton ('disabled', !printEnabled);
    $('[no-sections-fade]').css ({opacity: !printEnabled ? 0.55 : 1.00});
    $('[controltype=button]').jqxButton ('disabled', !printEnabled);

    if ($('#radiobutton-outputformat-cgc').jqxRadioButton ('checked'))
      $('#button-print-preview').jqxButton ('disabled', true);

    $('#checkbox-suppress-noqualifying').jqxCheckBox ('disabled', $('#radiobutton-outputformat-envelopes').jqxRadioButton ('checked'));
    $('[envelopes-fade]').css ({opacity: $('#radiobutton-outputformat-envelopes').jqxRadioButton ('checked') ? 0.55 : 1.00});
  };

  //
  //
  //
  App.validateNotEmpty = function (input, level, field) {
    if (App.getMatchLevel () !== level)
      return true;
    if (!$('#radiobutton-' + level + '-' + field + '-award-step-custom').jqxRadioButton ('checked'))
      return true;
    return input.val ().trim ().length ? true : false;
  };
  App.validateIllegalChars = function (input, level, field) {
    if (App.getMatchLevel () !== level)
      return true;
    if (!$('#radiobutton-' + level + '-' + field + '-award-step-custom').jqxRadioButton ('checked'))
      return true;
    if (!input.val ().trim ().length)
      return true;
    return input.val ().trim ().search (/[^0-9, ]/) === -1 ? true : false;
  };
  App.validateNonZero = function (input, level, field) {
    if (App.getMatchLevel () !== level)
      return true;
    if (!$('#radiobutton-' + level + '-' + field + '-award-step-custom').jqxRadioButton ('checked'))
      return true;
    return _.every (input.val ().trim ().replace (/,+/g, ',').replace (/^,|,+$/g, '').split (','), function (v) {
      return parseInt (v);
    });
  };
  App.validateValuesOrder = function (input, level, field) {
    var last = 0;
    if (App.getMatchLevel () !== level)
      return true;
    if (!$('#radiobutton-' + level + '-' + field + '-award-step-custom').jqxRadioButton ('checked'))
      return true;
    return _.every (input.val ().trim ().replace (/,+/g, ',').replace (/^,|,+$/g, '').split (','), function (v) {
      v = parseInt (v);
      if (last && (v <= last))
        return false;
      last = v;
      return true;
    });
  };

  App.initializeControls = function () {
    $('[controltype=checkbox]').jqxCheckBox ();
    $('[checkbox-is-selected]').jqxCheckBox ({checked: true});

    $('[controltype=radiobutton]').each (function () {
      $(this).jqxRadioButton ({
        groupName: $(this).attr ('radiobutton-group'),
        checked: !_.isUndefined ($(this).attr ('radiobutton-is-selected')) ? true : false,
      });
    });

    $('[numberinput-default]').each (function () {
      $(this).jqxNumberInput ({
        value: $(this).attr ('numberinput-default'),
        min: $(this).attr ('numberinput-min'),
        max: $(this).attr ('numberinput-max'),
        height: 25,
        width: 45,
        decimalDigits: 0,
        inputMode: 'simple',
        spinButtons: true
      });
    });

    $('[controltype=textinput]').each (function () {
      $(this).jqxInput ({
        height: 25,
        width: $(this).attr ('textinput-width'),
        minLength: 1,
        maxLength: $(this).attr ('textinput-maxlen'),
      });
    });

    $('[csv-validation]').on ('blur', function () {
      $('#settings').jqxValidator ('validate');
    });

    $('#settings').jqxValidator ({
      focus: true,
      closeOnClick: false,
      onSuccess: function () {
        if ((App.buttonUsed === 'print-preview' || App.buttonUsed === 'screen')) {
          App.displayAwards (App.updatePrintVariables (), App.matchData);

          if (App.buttonUsed === 'print-preview')
            window.print ();
          else if (App.buttonUsed === 'screen') {
            var html =
              '<html lang="en"><head>' +
                document.head.innerHTML +
              '</head><body>' +
                $('#awards').html () +
              '</body></html>';

            window.open ().document.write (html);
          }
        }

        App.buttonUsed = null;
      },
      rules: [
        { input: '#textinput-l2-class-award-step-custom',    position: 'bottom', message:  'At least one value is required',                                        action: 'keyup, blur', rule: function (input) {return App.validateNotEmpty     (input, 'l2', 'class');} },
        { input: '#textinput-l2-class-award-step-custom',    position: 'bottom', message:  'Illegal character found (only 0..9, commas, and spaces are permitted)', action: 'keyup, blur', rule: function (input) {return App.validateIllegalChars (input, 'l2', 'class');} },
        { input: '#textinput-l2-class-award-step-custom',    position: 'bottom', message:  '0 is not a permitted value',                                            action: 'keyup, blur', rule: function (input) {return App.validateNonZero      (input, 'l2', 'class');} },
        { input: '#textinput-l2-class-award-step-custom',    position: 'bottom', message:  'Values must be in ascending order, with no duplicates',                 action: 'keyup, blur', rule: function (input) {return App.validateValuesOrder  (input, 'l2', 'class');} },
        { input: '#textinput-l2-category-award-step-custom', position: 'bottom', message:  'At least one value is required',                                        action: 'keyup, blur', rule: function (input) {return App.validateNotEmpty     (input, 'l2', 'category');} },
        { input: '#textinput-l2-category-award-step-custom', position: 'bottom', message:  'Illegal character found (only 0..9, commas, and spaces are permitted)', action: 'keyup, blur', rule: function (input) {return App.validateIllegalChars (input, 'l2', 'category');} },
        { input: '#textinput-l2-category-award-step-custom', position: 'bottom', message:  '0 is not a permitted value',                                            action: 'keyup, blur', rule: function (input) {return App.validateNonZero      (input, 'l2', 'category');} },
        { input: '#textinput-l2-category-award-step-custom', position: 'bottom', message:  'Values must be in ascending order, with no duplicates',                 action: 'keyup, blur', rule: function (input) {return App.validateValuesOrder  (input, 'l2', 'category');} },
        { input: '#textinput-l1-class-award-step-custom',    position: 'bottom', message:  'At least one value is required',                                        action: 'keyup, blur', rule: function (input) {return App.validateNotEmpty     (input, 'l1', 'class');} },
        { input: '#textinput-l1-class-award-step-custom',    position: 'bottom', message:  'Illegal character found (only 0..9, commas, and spaces are permitted)', action: 'keyup, blur', rule: function (input) {return App.validateIllegalChars (input, 'l1', 'class');} },
        { input: '#textinput-l1-class-award-step-custom',    position: 'bottom', message:  '0 is not a permitted value',                                            action: 'keyup, blur', rule: function (input) {return App.validateNonZero      (input, 'l1', 'class');} },
        { input: '#textinput-l1-class-award-step-custom',    position: 'bottom', message:  'Values must be in ascending order, with no duplicates',                 action: 'keyup, blur', rule: function (input) {return App.validateValuesOrder  (input, 'l1', 'class');} },
        { input: '#textinput-l1-category-award-step-custom', position: 'bottom', message:  'At least one value is required',                                        action: 'keyup, blur', rule: function (input) {return App.validateNotEmpty     (input, 'l1', 'category');} },
        { input: '#textinput-l1-category-award-step-custom', position: 'bottom', message:  'Illegal character found (only 0..9, commas, and spaces are permitted)', action: 'keyup, blur', rule: function (input) {return App.validateIllegalChars (input, 'l1', 'category');} },
        { input: '#textinput-l1-category-award-step-custom', position: 'bottom', message:  '0 is not a permitted value',                                            action: 'keyup, blur', rule: function (input) {return App.validateNonZero      (input, 'l1', 'category');} },
        { input: '#textinput-l1-category-award-step-custom', position: 'bottom', message:  'Values must be in ascending order, with no duplicates',                 action: 'keyup, blur', rule: function (input) {return App.validateValuesOrder  (input, 'l1', 'category');} },
      ],
    });

    $('[controltype=dropdownlist]').each (function () {
      $(this).jqxDropDownList ({
        width: 135,
        source: statesAdapter,
        selectedIndex: 0,
      });
    });

    $('[controltype=button]').each (function () {
      $(this).jqxButton ({
        width: $(this).attr ('button-width'),
      });
    });

    $("[controltype=checkbox], [controltype=radiobutton]").each (function () {
      $(this).on ('click', function () {
        App.updateButtonStates ();
      });
    });

    $('#button-screen').on ('click', function () {
      App.buttonUsed = 'screen';
      $('#settings').jqxValidator ('validate');
    });

    $('#button-print-preview').on ('click', function () {
      App.buttonUsed = 'print-preview';
      $('#settings').jqxValidator ('validate');
    });

    $('#radiobutton-match-level-' + (App.matchData.m.match_level || 'l1').toLowerCase ()).jqxRadioButton ({checked: true});
  };

  //
  //
  //
  App.socketConnect = function () {
    $('.showondisconnect').hide ();
    $('.hideondisconnect').show ();

    App.socket.emit ('match:get', {options: {all: true}}, function (data) {
      App.matchData = data.matchData;
      $('#matchname').text (App.matchData.m.match_name);

      App.socket.emit ('settings:awards:load', {
        uuid: App.matchData.m.match_id
      }, function (data) {
        App.initializeControls ();

        if (data.err) {
          console.log ('Error loading awards settings: ' + data.err);
          alert ('Error loading awards settings: ' + data.err);
        } else if (data.settings)
          App.loadAwardsSettings (data.settings);

        App.updateButtonStates ();
        $('#settings').show ();
      });
    });
  };

  App.socketDisconnect = function () {
    $('.hideondisconnect, .hideondisconnectex').hide ();
    $('.showondisconnect').show ();
  };

  App.matchUpdated = function () {
    App.matchDataChanged = true;
  };

  App.reload = function () {
    alert ('New match loaded, reloading awards page!');
    window.location.href = 'http://' + window.location.host + '/reports/awards';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Reports->Awards'});

  window.onerror = function (msg, url, line, col, error) {
    if (App.socket) {
      App.socket.emit ('errorlog:error', {
        msg: msg,
        url: url,
        line: line,
        col: col,
        stack: error.stack,
      });
    } else {
      alert ('An internal error has occurred. Please check the javascript console for errors');
    }

    return false;
  };
});
