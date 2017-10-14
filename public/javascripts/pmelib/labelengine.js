/* global _:false */

//
//
//
var pmelib = (function (my) {
  'use strict';

  my.labelEngine = function (pv, printList, getLabelFunc, getFillerFunc) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var page;
    var row;
    var col;
    var count;

    var labelClipPath = function (pv) {
      var clipPath = document.createElementNS (svgNS, 'clipPath');
      var rect = document.createElementNS (svgNS, 'rect');

      clipPath.setAttribute ('id', 'clip-' + pv.pageNumber);

      rect.setAttribute ('x', '0pt');
      rect.setAttribute ('y', '0pt');
      rect.setAttribute ('width', (pv.labelSpec.label.width - 1) + 'pt');
      rect.setAttribute ('height', (pv.labelSpec.label.height - 1) + 'pt');
      rect.setAttribute ('rx', pv.labelSpec.label.radius);
      rect.setAttribute ('ry', pv.labelSpec.label.radius);

      clipPath.appendChild (rect);

      return clipPath;
    };

    var labelFrame = function (pv) {
      var rect = document.createElementNS (svgNS, 'rect');

      rect.setAttribute ('x', '0pt');
      rect.setAttribute ('y', '0pt');
      rect.setAttribute ('width', (pv.labelSpec.label.width - 1) + 'pt');
      rect.setAttribute ('height', (pv.labelSpec.label.height - 1) + 'pt');
      rect.setAttribute ('rx', pv.labelSpec.label.radius);
      rect.setAttribute ('ry', pv.labelSpec.label.radius);
      rect.setAttribute ('style', 'fill:none; stroke:black;');

      return rect;
    };

    var createLabel = function (pv, labelFields) {
      var svg = document.createElementNS (svgNS, 'svg');

      svg.setAttribute ('width', pv.labelSpec.label.width + 'pt');
      svg.setAttribute ('height', pv.labelSpec.label.height + 'pt');
      svg.setAttribute ('clip-path', 'url(#clip-' + pv.pageNumber + ')');

      _.each (labelFields, function (field) {
        var svgElement = document.createElementNS (svgNS, 'text');

        if (!_.isUndefined (field.html))
          svgElement.innerHTML = field.html;
        else if (!_.isUndefined (field.text))
          svgElement.innerHTML = field.text.replace (/ /g, '&nbsp;');
        else
          svgElement.innerHTML = '(no content defined)';

        _.each (field.attrs, function (attrValue, attrName) {
          svgElement.setAttribute (attrName, attrValue);
        });

        svg.appendChild (svgElement);
      });

      if (pv.showLabelOutline)
        svg.appendChild (labelFrame (pv));

      return svg;
    };

    var appendLabel = function (label) {
      if (!page) {
        col = 0;
        row = 0;
        count = 0;
        page = document.createElementNS (svgNS, 'svg');
        page.setAttribute ('width', pv.labelSpec.page.width + 'pt');
        page.setAttribute ('height', pv.labelSpec.page.height + 'pt');
        page.setAttribute ('x', '0pt');
        page.setAttribute ('y', '0pt');
        page.appendChild (labelClipPath (pv));
      }

      if (label) {
        label.setAttribute ('x', (pv.labelSpec.columns [col] + (pv.hjog || 0)) + 'pt');
        label.setAttribute ('y', (pv.labelSpec.rows [row] + (pv.vjog || 0)) + 'pt');

        page.appendChild (label);
      }

      if (pv.orderDownThenAcross) {
        if (++row === pv.labelSpec.geometry.down) {
          row = 0;
          col++;
        }
      } else {
        if (++col === pv.labelSpec.geometry.across) {
          col = 0;
          row++;
        }
      }

      if (++count === pv.labelSpec.geometry.page) {
        $('#labels').append (page);
        page = null;
        pv.pageNumber++;
      }
    };

    var addLabel = function (fieldList) {
      appendLabel (createLabel (pv, fieldList));
    };

    //
    //
    //
    $('#labels').empty ();

    pv.pageNumber = 1;

    _.each (printList, function (shooter) {
      getLabelFunc (shooter, addLabel);

      switch (pv.nextCompetitorsStartsOn) {
        case 'sheet' :
          if (count)
            _.times (pv.labelSpec.geometry.page - count, function () {
              getFillerFunc (shooter, addLabel);
            });
          break;

        case 'column' :
            if (pv.orderDownThenAcross ? row : col)
              _.times (pv.orderDownThenAcross ? (pv.labelSpec.geometry.down - row) : (pv.labelSpec.geometry.across - col), function () {
                getFillerFunc (shooter, addLabel);
              });
          break;

        case 'next' :
          break;
      }
    });

    if (count !== pv.labelSpec.geometry.page)
      $('#labels').append (page);
  };
  return my;
}(pmelib || {}));
