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

  //
  //
  //
  var validationMessage1 = 'At least one value is required';
  var validationMessage2 = 'Illegal character found (only 0..9, commas, and spaces are permitted)';
  var validationMessage3 = '0 is not a permitted value';
  var validationMessage4 = 'Values must be in ascending order, with no duplicates';
  var validationAction = 'keyup,blur';

  var validationRules = [
    { input: '#textinput-l2-class-award-step-custom',    message: validationMessage1, action: validationAction, rule: function (input) {return App.validateNotEmpty       (input, 'l2', 'class');} },
    { input: '#textinput-l2-class-award-step-custom',    message: validationMessage2, action: validationAction, rule: function (input) {return App.validateIllegalChars   (input, 'l2', 'class');} },
    { input: '#textinput-l2-class-award-step-custom',    message: validationMessage3, action: validationAction, rule: function (input) {return App.validateNonZero        (input, 'l2', 'class');} },
    { input: '#textinput-l2-class-award-step-custom',    message: validationMessage4, action: validationAction, rule: function (input) {return App.validateValuesOrder    (input, 'l2', 'class');} },
    { input: '#textinput-l2-category-award-step-custom', message: validationMessage1, action: validationAction, rule: function (input) {return App.validateNotEmpty       (input, 'l2', 'category');} },
    { input: '#textinput-l2-category-award-step-custom', message: validationMessage2, action: validationAction, rule: function (input) {return App.validateIllegalChars   (input, 'l2', 'category');} },
    { input: '#textinput-l2-category-award-step-custom', message: validationMessage3, action: validationAction, rule: function (input) {return App.validateNonZero        (input, 'l2', 'category');} },
    { input: '#textinput-l2-category-award-step-custom', message: validationMessage4, action: validationAction, rule: function (input) {return App.validateValuesOrder    (input, 'l2', 'category');} },

    { input: '#textinput-l1-class-award-step-custom',    message: validationMessage1, action: validationAction, rule: function (input) {return App.validateNotEmpty     (input, 'l1', 'class');} },
    { input: '#textinput-l1-class-award-step-custom',    message: validationMessage2, action: validationAction, rule: function (input) {return App.validateIllegalChars (input, 'l1', 'class');} },
    { input: '#textinput-l1-class-award-step-custom',    message: validationMessage3, action: validationAction, rule: function (input) {return App.validateNonZero      (input, 'l1', 'class');} },
    { input: '#textinput-l1-class-award-step-custom',    message: validationMessage4, action: validationAction, rule: function (input) {return App.validateValuesOrder  (input, 'l1', 'class');} },
    { input: '#textinput-l1-category-award-step-custom', message: validationMessage1, action: validationAction, rule: function (input) {return App.validateNotEmpty     (input, 'l1', 'category');} },
    { input: '#textinput-l1-category-award-step-custom', message: validationMessage2, action: validationAction, rule: function (input) {return App.validateIllegalChars (input, 'l1', 'category');} },
    { input: '#textinput-l1-category-award-step-custom', message: validationMessage3, action: validationAction, rule: function (input) {return App.validateNonZero      (input, 'l1', 'category');} },
    { input: '#textinput-l1-category-award-step-custom', message: validationMessage4, action: validationAction, rule: function (input) {return App.validateValuesOrder  (input, 'l1', 'category');} },
  ];

  //
  //  Create an array of classes that are active in this match. Then reorder it
  //  to our preferred order.
  //
  App.getMatchClasses = function () {
    var classes = _.uniq (_.map (App.matchData.m.match_shooters, function (s) { return s.sh_grd; }));
    var used = [];

    _.each (['G', 'M', 'A', 'B', 'C', 'D', 'U'], function (classs) {
      if (_.indexOf (classes, classs) >= 0)
        used.push (classs);
    });

    App.matchClasses = used;
  };

  App.getMatchCategories = function () {
    App.matchCategories = App.matchData.m.match_ctgs;
  };

  //
  //
  //
  App.buildProjections = function (pv) {
    var suffixMap = ['th', 'st', 'nd', 'rd'];

    _.each (App.matchDivisions, function (division) {
      var divisionShooters = _.filter (App.matchData.m.match_shooters, 'sh_dvp', division);
      var awards = {
        hoaList: [],
        areaList: [],
        stateList: [],
        classList: [],
        categoryList: [],
        combinedList: [],
        competitorCount: divisionShooters.length,
      };

      _.each (['classTotal', 'categoryTotal', 'HOA', 'State', 'Area'], function (n) {
        awards [n] = {
          places: 0,
          count: 0,
        };
      });

      if (divisionShooters.length >= pv.division.minimumEntries) {
        awards.HOA = {
          places: 1,
          count: 1
        };
        awards.hoaList.push ({
          item: 'HOA',
          place: 1,
          text: '',
          group: 'division',
        });

        if (pv.matchLevel === 'l3') {
          if (_.any (divisionShooters, function (shooter) { return (shooter.sh_area === pv.champion.area); })) {
            awards.Area = {
              places: 1,
              count: 1
            };
            awards.areaList.push ({
              item: 'Area',
              place: 2,
              text: '',
              group: 'division',
            });
          }
        }

        if (pv.matchLevel === 'l2') {
          if (_.any (divisionShooters, function (shooter) { return (shooter.sh_st === pv.champion.state); })) {
            awards.State = {
              places: 1,
              count: 1
            };
            awards.stateList.push ({
              item: 'State',
              place: 2,
              text: '',
              group: 'division',
            });
          }
        }
      }

      //
      //  Process the class awards for this division
      //
      _.each (App.matchClasses, function (classs) {
        var numberOfPlaces = pv.class.awardStep.length;
        var places = 0;
        var numberInClass = _.filter (divisionShooters, 'sh_grd', classs).length;

        if (!((!pv.class.ignoreDivisionMinimum && (divisionShooters.length < pv.division.minimumEntries)) ||
            (pv.class.ignoreDivisionMinimum && (numberInClass < pv.class.minimumEntries))))
          _.times (numberInClass, function () {
            if ((places < numberOfPlaces) && (numberInClass >= pv.class.awardStep [places])) {
              places++;
              awards.classList.push ({
                item: classs,
                place: places,
                text: places + suffixMap [(places > 3) ? 0 : (places % 10)],
                group: 'class',
              });
            }
          });

        awards [classs] = {
          places: places,
          count: numberInClass,
        };

        awards.classTotal.places += places;
        awards.classTotal.count += numberInClass;
      });

      //
      //  Process the category awards for this division
      //
      _.each (App.matchCategories, function (ctg) {
        var numberOfPlaces = pv.category.awardStep.length;
        var places = 0;
        var numberInCategory = _.filter (divisionShooters, function (shooter) {
          return _.contains (shooter.sh_ctgs, ctg);
        }).length;

        if (!((!pv.category.ignoreDivisionMinimum && (divisionShooters.length < pv.division.minimumEntries)) ||
            (pv.category.ignoreDivisionMinimum && (numberInCategory.length < pv.category.minimumEntries))))
          _.times (numberInCategory, function () {
            if ((places < numberOfPlaces) && (numberInCategory >= pv.category.awardStep [places])) {
              places++;
              awards.categoryList.push ({
                item: ctg,
                place: places,
                text: places + suffixMap [(places > 3) ? 0 : (places % 10)],
                group: 'category',
              });
            }
          });

        awards [ctg] = {
          places: places,
          count: numberInCategory,
        };

        awards.categoryTotal.places += places;
        awards.categoryTotal.count += numberInCategory;
      });

      awards.combinedList = awards.combinedList.concat (awards.hoaList, awards.areaList, awards.stateList, awards.classList, awards.categoryList);

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

    var mapPosition = function (arr, options) {
      var temp = [];
      options = options || {};

      if (!options.position && !options.names)
        options.position = true;

      _.each (arr, function (n, index) {
        var i = index + 1;
        var t = i % 10;
        var s = '';

        if (options.prefix)
          n = options.prefix + n;
        if (options.suffix)
          n += options.suffix;

        if ((index > 0) && (index % 5 === 0))
          s = '<br>' + s;

        if (options.position) {
          if (t === 1)
            s += i + 'st=' + n;
          else if (t === 2)
            s += i + 'nd=' + n;
          else if (t === 3)
            s += i + 'rd=' + n;
          else
            s += i + 'th=' + n;
        } else if (options.names)
          s = (options.names [index] || '?') + '=' + n;
        else
          s = '???';
        temp.push (s);
      });
      return temp.join (',');
    };

    table.className = 'config';

    addToTable ('Entries required per division:', pv.division.minimumEntries);
    addToTable ('Payout per position:', mapPosition (pv.division.payout, {names: ['HOA', pv.matchLevelText], prefix: '$'}));
    addToTable ('&nbsp;', '&nbsp');

    if (pv.class.print) {
      addToTable ('Entries required per class:', pv.class.minimumEntries);
      addToTable ('Competitors required per position:', mapPosition (pv.class.awardStep));
      addToTable ('Awards per class:', pv.class.maximumAwards);
      addToTable ('Payout per position:', mapPosition (pv.class.payout, {prefix: '$'}));
      addToTable ('&nbsp;', '&nbsp');
    }

    if (pv.category.print) {
      addToTable ('Entries required per category:', pv.category.minimumEntries);
      addToTable ('Competitors required per position:', mapPosition (pv.category.awardStep));
      addToTable ('Awards per category:', pv.category.maximumAwards);
      addToTable ('Payout per position:', mapPosition (pv.category.payout, {prefix: '$'}));
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
  App.displayByDivisionEx = function (pv) {
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;
    var totalCompetitors = 0;
    var totals = {
      competitors: 0,
      hoa: 0,
      area: 0,
      state: 0,
      percent: '',
    };

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Competitor Count By Division';
    th.setAttribute ('colSpan', 5);
    tr.appendChild (th);
    thead.appendChild (tr);

    tr = document.createElement ('tr');
    _.each (['', 'Total', '%', 'HOA', pv.matchLevelText], function (f) {
      th = document.createElement ('th');
      th.innerHTML = f;
      th.style.cssText = f.length ? 'width: 50px;' : '';
      tr.appendChild (th);
    });
    tbody.appendChild (tr);

    _.each (App.awardsResults, function (division) {
      totalCompetitors += division.competitorCount;
    });

    _.each (App.awardsResults, function (division, divisionName) {
      var competitorCount = division.competitorCount;
      var hoaCount = division.hoaList.length ? 1 : 0;
      var areaCount = division.areaList.length ? 1 : 0;
      var stateCount = division.stateList.length ? 1 : 0;
      var count;

      totals.competitors += competitorCount;
      totals.hoa += hoaCount;
      totals.area += areaCount;
      totals.state += stateCount;

      if (pv.matchLevel === 'l3')
        count = areaCount;
      else if (pv.matchLevel === 'l2')
        count = stateCount;
      else
        count = '';

      tr = document.createElement ('tr');
      td = document.createElement ('td');
      td.innerHTML = divisionName;
      tr.appendChild (td);

      td = document.createElement ('td');
      td.style.cssText = 'text-align: right; padding-right: 14px;';
      td.innerHTML = competitorCount || '';
      tr.appendChild (td);
      tbody.appendChild (tr);

      td = document.createElement ('td');
      td.style.cssText = 'text-align: right; padding-right: 14px;';
      td.innerHTML = ((competitorCount / totalCompetitors) * 100).toFixed (2);
      tr.appendChild (td);
      tbody.appendChild (tr);

      td = document.createElement ('td');
      td.style.cssText = 'text-align: right; padding-right: 14px;';
      td.innerHTML = hoaCount || '';
      tr.appendChild (td);
      tbody.appendChild (tr);

      td = document.createElement ('td');
      td.style.cssText = 'text-align: right; padding-right: 14px;';
      td.innerHTML = count || '';
      tr.appendChild (td);
      tbody.appendChild (tr);
    });

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.style.cssText = 'font-weight: bold;';
    td.innerHTML = 'Total';
    tr.appendChild (td);
    _.each (['competitors', 'percent', 'hoa', pv.matchLevelText.toLowerCase ()], function (f) {
      td = document.createElement ('td');
      td.style.cssText = 'text-align: right; padding-right: 14px;';
      td.innerHTML = totals [f] || '';
      tr.appendChild (td);
    });
    tbody.appendChild (tr);

    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    return div;
  };

  App.displayByDivision = function (pv) {
    var fragment = document.createDocumentFragment ();

    fragment.appendChild (App.putHeader ('Division Awards'));
    fragment.appendChild (App.displayByDivisionEx (pv));
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  //
  //  Create table showing number of classes horizontally and divisions
  //  vertically, with cells containing the number of shooters in each division
  //  for each class.
  //
  App.displayByClassEx = function (field, matchClasses) {
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;
    var classTotals = {};
    var shortNames = {
      'classTotal': 'Total',
    };

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Competitor ' + field.substr (0, 1).toUpperCase () + field.substr (1) + ' By Division/Class';
    th.setAttribute ('colSpan', matchClasses.length + 1);
    tr.appendChild (th);
    thead.appendChild (tr);

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    tr.appendChild (th);

    _.each (matchClasses, function (classs) {
      th = document.createElement ('th');
      th.style.cssText = 'width: 40px;';
      th.innerHTML = shortNames [classs] ? shortNames [classs] : classs;
      tr.appendChild (th);
      classTotals [classs] = 0;
    });
    thead.appendChild (tr);

    _.each (App.awardsResults, function (division, divisionName) {
      tr = document.createElement ('tr');
      td = document.createElement ('td');
      td.innerHTML = divisionName;
      tr.appendChild (td);
      _.each (matchClasses, function (classs) {
        td = document.createElement ('td');
        td.style.cssText = 'text-align: right; padding-right: 12px;';

        if (division [classs]) {
          td.innerHTML = (division [classs][field] ? division [classs][field] : '');
          classTotals [classs] += division [classs][field];
        }

        tr.appendChild (td);
      });
      tbody.appendChild (tr);
    });

    //
    //
    //
    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.style.cssText = 'font-weight: bold;';
    td.innerHTML = 'Total';
    tr.appendChild (td);

    _.each (matchClasses, function (classs) {
      td = document.createElement ('td');
      td.style.cssText = 'text-align: right; padding-right: 12px;';
      td.innerHTML = (classTotals [classs] ? classTotals [classs] : '');
      tr.appendChild (td);
    });
    tbody.appendChild (tr);

    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    return div;
  };

  App.displayByClass = function () {
    var fragment = document.createDocumentFragment ();

    fragment.appendChild (App.putHeader ('Class Awards'));
    fragment.appendChild (App.displayByClassEx ('count', App.matchClasses.concat ('classTotal')));
    fragment.appendChild (App.displayByClassEx ('places', App.matchClasses.concat ('classTotal')));
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  //
  //  Create table showing number of categories horizontally and divisions
  //  vertically, with cells containing the number of shooters in each division
  //  for each category.
  //
  App.displayByCategoryEx = function (field, matchCategories) {
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;
    var categoryTotals = {};
    var shortNames = {
      'Super Senior': 'Sup Sr',
      'Law Enforcement': 'LEO',
      'Military': 'Mil',
      'categoryTotal': 'Total',
    };

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    th.innerHTML = 'Competitor ' + field.substr (0, 1).toUpperCase () + field.substr (1) + ' By Division/Category';
    th.setAttribute ('colSpan', matchCategories.length + 1);
    tr.appendChild (th);
    thead.appendChild (tr);

    tr = document.createElement ('tr');
    th = document.createElement ('th');
    tr.appendChild (th);

    _.each (matchCategories, function (category) {
      th = document.createElement ('th');
      th.style.cssText = 'width: 60px;';
      th.innerHTML = shortNames [category] ? shortNames [category] : category;
      tr.appendChild (th);
      categoryTotals [category] = 0;
    });
    thead.appendChild (tr);

    _.each (App.awardsResults, function (division, divisionName) {
      tr = document.createElement ('tr');
      td = document.createElement ('td');
      td.innerHTML = divisionName;
      tr.appendChild (td);
      _.each (matchCategories, function (category) {
        td = document.createElement ('td');
        td.style.cssText = 'text-align: right; padding-right: 22px;';

        if (division [category]) {
          td.innerHTML = (division [category][field] ? division [category][field] : '');
          categoryTotals [category] += division [category][field];
        }

        tr.appendChild (td);
      });
      tbody.appendChild (tr);
    });

    //
    //
    //
    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.style.cssText = 'font-weight: bold;';
    td.innerHTML = 'Total';
    tr.appendChild (td);

    _.each (matchCategories, function (category) {
      td = document.createElement ('td');
      td.style.cssText = 'text-align: right; padding-right: 22px;';
      td.innerHTML = (categoryTotals [category] ? categoryTotals [category] : '');
      tr.appendChild (td);
    });
    tbody.appendChild (tr);

    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (table);

    return div;
  };

  App.displayByCategory = function () {
    var fragment = document.createDocumentFragment ();

    fragment.appendChild (App.putHeader ('Category Awards'));
    fragment.appendChild (App.displayByCategoryEx ('count', App.matchCategories.concat ('categoryTotal')));
    fragment.appendChild (App.displayByCategoryEx ('places', App.matchCategories.concat ('categoryTotal')));
    fragment.appendChild (App.putPageBreak ());

    return fragment;
  };

  //
  //  Create a table with the columns being the divisions, and the rows being
  //  the class and category position and name.
  //
  App.displayPayout = function (pv) {
    var div = document.createElement ('div');
    var table = document.createElement ('table');
    var thead = document.createElement ('thead');
    var tbody = document.createElement ('tbody');
    var tr, th, td;
    var cssTD;
    var longest = 0;
    var columns = 0;
    var columnNumber = 0;
    var payoutByDivision = {};
    var payoutTotal = 0;

    _.each (App.awardsResults, function (division) {
      if (division.combinedList.length)
        columns++;
    });

    if (!columns)
      return div;

    cssTD  = (columns > 2) ? 3 : columns;

    tr = document.createElement ('tr');
    _.each (App.awardsResults, function (division, divisionName) {
      if (division.combinedList.length) {
        var cssCol = (columnNumber++ === 0) ? 'left' : (columnNumber === columns) ? 'right' : 'middle';
        var cssSel = 'payout-' + cssTD + '-' + cssCol + '-header';

        longest = _.max ([longest, division.combinedList.length]);
        th = document.createElement ('th');
        th.setAttribute ('colSpan', 2);
        th.className = cssSel;
        th.innerHTML = divisionName;
        tr.appendChild (th);
      }
    });
    thead.appendChild (tr);

    _.times (longest, function (index) {
      columnNumber = 0;
      tr = document.createElement ('tr');

      _.each (App.awardsResults, function (division, divisionName) {
        if (division.combinedList.length) {
          var p      = division.combinedList [index];
          var place  = p ? p.place : 0;
          var item   = p ? p.item  : '';
          var text   = p ? p.text  : '';
          var group  = p ? p.group : null;
          var payout = (group && pv [group] && pv [group].payout && pv [group].payout [divisionName]) ? (pv [group].payout [divisionName][place - 1] || 0) : null;
          var cssCol = (columnNumber++ === 0) ? 'left' : (columnNumber === columns) ? 'right' : 'middle';
          var cssSel = 'payout-' + cssTD + '-' + cssCol + '-';

          td = document.createElement ('td');
          td.className = cssSel + 'item';
          td.innerHTML = text + ' ' + item;
          tr.appendChild (td);

          td = document.createElement ('td');
          td.className = cssSel + 'payout';
          td.innerHTML = _.isNull (payout) ? '' : ('$' + payout);
          tr.appendChild (td);

          payoutByDivision [divisionName] = (payoutByDivision [divisionName] || 0) + (_.isNull (payout) ? 0 : payout);
        }
      });
      tbody.appendChild (tr);
    });

    tr = document.createElement ('tr');
    columnNumber = 0;
    _.each (payoutByDivision, function (total) {
      var cssCol = (columnNumber++ === 0) ? 'left' : (columnNumber === columns) ? 'right' : 'middle';
      var cssSel = 'payout-' + cssTD + '-' + cssCol + '-';

      td = document.createElement ('td');
      td.className = cssSel + 'item';
      td.style.cssText = 'font-weight: bold; padding-top: 15px;';
      td.innerHTML = 'Total:';
      tr.appendChild (td);

      td = document.createElement ('td');
      td.className = cssSel + 'payout';
      td.style.cssText = 'font-weight: bold; padding-top: 15px;';
      td.innerHTML = '$' + total;
      tr.appendChild (td);

      payoutTotal += total;
    });
    tbody.appendChild (tr);

    tr = document.createElement ('tr');
    td = document.createElement ('td');
    td.setAttribute ('colSpan', columns * 2);
    td.style.cssText = 'font-weight: bold; text-align: center; padding-top: 15px;';
    td.innerHTML = 'Grand Total: $' + payoutTotal;
    tr.appendChild (td);
    tbody.appendChild (tr);

    table.className = 'payout';
    table.appendChild (thead);
    table.appendChild (tbody);

    div.style.cssText = 'padding-top: 15px; padding-bottom: 15px';
    div.appendChild (App.putHeader ('Places'));
    div.appendChild (table);

    return div;
  };

  //
  //
  //
  App.displayPagePresentation = function (pv) {
    var bodyFragment = document.createDocumentFragment ();
    var matchFragment = document.createDocumentFragment ();
    var configFragment = document.createDocumentFragment ();
    var resultsFragment = document.createDocumentFragment ();

    //
    //  Create the match info and configuration fragments
    //
    matchFragment.appendChild (App.displayMatchInfo (pv));
    configFragment.appendChild (App.displayConfig (pv));

    if (pv.division.print)
      resultsFragment.appendChild (App.displayByDivision (pv));

    if (pv.class.print)
      resultsFragment.appendChild (App.displayByClass (pv));

    if (pv.category.print)
      resultsFragment.appendChild (App.displayByCategory (pv));

    resultsFragment.appendChild (App.displayPayout (pv));

    //
    //  And this is the actual order we display them in
    //
    bodyFragment.appendChild (matchFragment);
    bodyFragment.appendChild (configFragment);
    bodyFragment.appendChild (resultsFragment);

    $('#projections').empty ().append (bodyFragment);
  };

  //
  //
  //
  App.errorMessage = function (msg) {
    var p = document.createElement ('p');
    p.innerHTML = msg;
    p.id = 'errorMessage';
    $('#projections').empty ().append (p).show ();
  };

  //
  //
  //
  App.displayAwards = function (pv, matchData) {
    if (!matchData || !matchData.m || !matchData.m.match_shooters || !matchData.m.match_shooters.length)
      return App.errorMessage ('Nothing to do, no competitors present!');

    App.matchData = matchData;

    //
    //  Re-init variables so we don't get accumulating TOC links, etc
    //
    App.matchDivisions = {};
    App.awardsResults = {};

    if (pv.sortCategories)
      App.matchData.m.match_ctgs = _.sortBy (App.matchData.m.match_ctgs, function (k) {return k;});

    pmelib.removeDeletedShooters (App.matchData);
    App.matchDivisions = pmelib.getMatchDivisions (App.matchData);
    App.getMatchClasses ();
    App.getMatchCategories ();
    App.buildProjections (pv);
    App.displayPagePresentation (pv);
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

    App.socket.emit ('settings:projection:save', {
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

      try {
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
      } catch (e) {
        console.log ('No longer used id found in configuration settings (\'%s\')', id);
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

    _.each (['champion', 'division', 'class', 'category'], function (group) {
      var step;
      var places;
      var levelGroup = matchLevel + '-' + group;

      pv [group] = pv [group] || {payout: {}};

      $('#checkbox-' + matchLevel + '-print-' + group).each (function () {
        pv [group].print = $(this).jqxCheckBox ('checked');
      });

      $('#numberinput-' + levelGroup + '-minimum-entries').each (function () {
        pv [group].minimumEntries = $(this).jqxNumberInput ('val');
      });

      $('#checkbox-' + levelGroup + '-ignore-division-minimum').each (function () {
        pv [group].ignoreDivisionMinimum = $(this).jqxCheckBox ('checked');
      });

      $('#numberinput-' + levelGroup + '-award-step').each (function () {
        step =  $('#numberinput-' + levelGroup + '-award-step').jqxNumberInput ('val');
        places = $('#numberinput-' + levelGroup + '-maximum-awards').jqxNumberInput ('val');
        pv [group].awardStep = _.times (places, function (n) { return (n + 1) * step; });

        $('#radiobutton-' + levelGroup + '-award-step-custom').each (function () {
          if ($(this).jqxRadioButton ('checked')) {
            pv [group].awardStep = [];
            _.each ($('#textinput-' + levelGroup + '-award-step-custom').jqxInput ('val').trim ().replace (/,+/g, ',').replace (/^,|,+$/g, '').split (','), function (v, index) {
              pv [group].awardStep [index] = parseInt (v);
            });
          }
        });

        pv [group].maximumAwards = pv [group].awardStep.length;
      });

      $('[id^="textinput-' + levelGroup + '-payout-"]').each (function () {
        var id = $(this).attr ('id');
        var division = id.replace (/.*-/, '').toUpperCase ();

        pv [group].payout [division] = [];

        _.each ($(this).jqxInput ('val').trim ().replace (/,+/g, ',').replace (/^,|,+$/g, '').split (','), function (v, index) {
          v = parseInt (v);
          pv [group].payout [division][index] = _.isNaN (v) ? 0 : v;
        });
      });
    });

    $('#numberinput-' + matchLevel + '-area-number').each (function () {
      pv.champion.area = $(this).jqxNumberInput ('val');
    });

    $('#dropdownlist-' + matchLevel + '-state-tla').each (function () {
      if ($(this).jqxDropDownList ('getSelectedItem'))
        pv.champion.state = $(this).jqxDropDownList ('getSelectedItem').value;
    });

    if (pv.matchLevel === 'l4')
      pv.matchLevelText = 'National';
    else if (pv.matchLevel === 'l3')
      pv.matchLevelText = 'Area';
    else if (pv.matchLevel === 'l2')
      pv.matchLevelText = 'State';
    else
      pv.matchLevelText = 'n/a';

    if (pv.console)
      console.dir (pv);

    App.saveAwardsSettings ();

    return pv;
  };

  App.updateButtonStates = function () {
    var printEnabled = false;
    var matchLevel = App.getMatchLevel ();

    $('[match-level]').not ('[match-level=' + matchLevel + ']').hide ();
    $('[match-level=' + matchLevel + ']').show ();

    _.each (['l4', 'l3', 'l2', 'l1'], function (level) {
      _.each (['champion', 'class', 'category'], function (group) {
        var levelGroup = level + '-' + group;

        if (!$('[' + levelGroup + '-award-step-fixed]').length) {
          $('#radiobutton-' + levelGroup + '-award-step-normal').each (function () {
            var normal = $(this).jqxRadioButton ('checked');
            var selector = 'div[match-level=' + level + '] [' + group + '-step';

            $(selector + '-normal-disable]').jqxNumberInput ('disabled', !normal);
            $(selector + '-custom-disable]').jqxInput ('disabled', normal);
            $(selector + '-normal-fade]').css ({opacity:  normal ? 1.0 : 0.55});
            $(selector + '-custom-fade]').css ({opacity: !normal ? 1.0 : 0.55});
          });
        }

        $('div[match-level=' + level + '] [no-' + group + '-hide]').each (function () {
          $(this).toggle ($('#checkbox-' + level + '-print-' + group).jqxCheckBox ('checked'));
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

    $('[no-sections-disable]').each (function () {
      $(this).jqxRadioButton ('disabled', !printEnabled);
    });
    $('[no-sections-fade]').css ({opacity: !printEnabled ? 0.55 : 1.00});
    $('[controltype=button]').jqxButton ('disabled', !printEnabled);
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
  App.validateNotEmptyEx = function (input, level) {
    if (App.getMatchLevel () !== level)
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
  App.validateIllegalCharsEx = function (input, level) {
    if (App.getMatchLevel () !== level)
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
  App.validateNonZeroEx = function (input, level) {
    if (App.getMatchLevel () !== level)
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
  App.validateValuesOrderEx = function (input, level) {
    var last = 0;
    if (App.getMatchLevel () !== level)
      return true;
    return _.every (input.val ().trim ().replace (/,+/g, ',').replace (/^,|,+$/g, '').split (','), function (v) {
      v = parseInt (v);
      if (last && (v <= last))
        return false;
      last = v;
      return true;
    });
  };

  //
  // tr(no-division-hide).even#next-row-division
  //   td
  //     span(style='margin-top: 2px;').tleft Enter HOA and state payouts
  //     span(style='margin-right: -2px;').tright: input(type='text' controltype='textinput' placeholder='300,250' csv-validation textinput-width='150' textinput-maxlen='30' settings-save)#textinput-l2-division-payout
  //
  //  group ::= [division | class | category]
  //
  App.addTableControls = function () {
    var textinputIDs = [];

    _.each (['l4', 'l3', 'l2', 'l1'], function (matchlevel) {
      if ($('[id^="table-' + matchlevel + '"]').length) {
        _.each (['division', 'class', 'category'], function (group) {
          var table = $('#table-' + matchlevel + '-' + group);
          var fragment = document.createDocumentFragment ();
          var eo = $('tr:last', table).is (':even') ? 1 : 0;

          _.each (App.matchData.m.match_cats, function (division) {
            var tr = document.createElement ('tr');
            var td = document.createElement ('td');
            var spanLeft = document.createElement ('span');
            var spanRight = document.createElement ('span');
            var input = document.createElement ('input');
            var id = 'textinput-' + matchlevel + '-' + group + '-payout-' + division.toLowerCase ();

            textinputIDs.push (id);

            tr.className = (eo++ % 2) ? 'even' : 'odd';
            tr.setAttribute ('no-' + group + '-hide', '');

            spanLeft.style.cssText = 'margin-top: 2px;';
            spanLeft.className = 'tleft';
            spanLeft.innerHTML = 'Enter ' + division + (group === 'division' ? ' HOA and state' : ' 1st, 2nd, etc, place') + ' payouts';

            spanRight.style.cssText = 'margin-right: -2px;';
            spanRight.className = 'tright';

            input.type = 'text';
            input.setAttribute ('id', id);
            input.setAttribute ('controltype', 'textinput');
            input.setAttribute ('placeholder', (group === 'division' ? '300,250' : '100,80,60,40,20'));
            input.setAttribute ('csv-validation', '');
            input.setAttribute ('textinput-width', '150');
            input.setAttribute ('textinput-maxlen', '30');
            input.setAttribute ('settings-save', '');

            spanRight.appendChild (input);

            td.appendChild (spanLeft);
            td.appendChild (spanRight);

            tr.appendChild (td);

            fragment.appendChild (tr);

            validationRules.push ({
              input: '#' + id,
              message: validationMessage2,
              action: validationAction,
              rule: function (input) {return App.validateIllegalCharsEx (input, matchlevel);},
            });
          });

          $(table).append (fragment);
        });
      }
    });

    _.each (textinputIDs, function (id) {
      id = '#' + id;

      $(id).jqxInput ({
        height: 25,
        width: $(id).attr ('textinput-width'),
        minLength: 1,
        maxLength: $(id).attr ('textinput-maxlen'),
      });

      $(id).on ('blur', function () {
        $('#settings').jqxValidator ('validate');
      });
    });

    $('#settings').jqxValidator ({
      rules: validationRules,
    });
  };

  //
  //
  //
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
      position: 'bottom',
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
                $('#projections').html () +
              '</body></html>';

            window.open ().document.write (html);
          }
        }

        App.buttonUsed = null;
      },
      rules: validationRules,
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

    App.socket.emit ('match:get', {options: {match: true, lookups: true}}, function (data) {
      App.matchData = data.matchData;
      $('#matchname').text (App.matchData.m.match_name);

      App.socket.emit ('settings:projection:load', {
        uuid: App.matchData.m.match_id
      }, function (data) {
        App.initializeControls ();
        App.addTableControls ();

        if (data.err) {
          console.log ('Error loading projection settings: ' + data.err);
          alert ('Error loading projection settings: ' + data.err);
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
    alert ('New match loaded, reloading projection page!');
    window.location.href = 'http://' + window.location.host + '/reports/projection';
  };

  App.socket = io.connect ();
  App.socket.on ('connect', App.socketConnect);
  App.socket.on ('disconnect', App.socketDisconnect);
  App.socket.on ('match_updated', App.matchUpdated);
  App.socket.on ('reload', App.reload);

  App.socket.emit ('log:log', {msg: 'Reports->Projection'});

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
