/* global _:false */

//
//
//
var pmelib = (function (my) {
  'use strict';

  my.envelopeEngine = function (pv, printList, getEnvelopeFunc) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var page;

    var envelopeClipPath = function (pv) {
      var clipPath = document.createElementNS (svgNS, 'clipPath');
      var rect = document.createElementNS (svgNS, 'rect');

      clipPath.setAttribute ('id', 'clip-' + pv.pageNumber);

      rect.setAttribute ('x', '0pt');
      rect.setAttribute ('y', '0pt');
      rect.setAttribute ('width', (pv.envelopeSpec.envelope.width - 1) + 'pt');
      rect.setAttribute ('height', (pv.envelopeSpec.envelope.height - 1) + 'pt');
      rect.setAttribute ('rx', pv.envelopeSpec.envelope.radius);
      rect.setAttribute ('ry', pv.envelopeSpec.envelope.radius);

      clipPath.appendChild (rect);

      return clipPath;
    };

    var envelopeFrame = function (pv) {
      var rect = document.createElementNS (svgNS, 'rect');

      rect.setAttribute ('x', '0pt');
      rect.setAttribute ('y', '0pt');
      rect.setAttribute ('width', (pv.envelopeSpec.envelope.width - 1) + 'pt');
      rect.setAttribute ('height', (pv.envelopeSpec.envelope.height - 1) + 'pt');
      rect.setAttribute ('rx', pv.envelopeSpec.envelope.radius);
      rect.setAttribute ('ry', pv.envelopeSpec.envelope.radius);
      rect.setAttribute ('style', 'fill:none; stroke:black;');

      return rect;
    };

    var createEnvelope = function (pv, envelopeFields) {
      var svg = document.createElementNS (svgNS, 'svg');

      svg.setAttribute ('width', pv.envelopeSpec.envelope.width + 'pt');
      svg.setAttribute ('height', pv.envelopeSpec.envelope.height + 'pt');
      svg.setAttribute ('clip-path', 'url(#clip-' + pv.pageNumber + ')');

      _.each (envelopeFields, function (field) {
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

      if (pv.showEnvelopeOutline)
        svg.appendChild (envelopeFrame (pv));

      return svg;
    };

    var appendEnvelope = function (envelope) {
      page = document.createElementNS (svgNS, 'svg');
      page.setAttribute ('width', pv.envelopeSpec.envelope.width + 'pt');
      page.setAttribute ('height', pv.envelopeSpec.envelope.height + 'pt');
      page.setAttribute ('x', '0pt');
      page.setAttribute ('y', '0pt');
      page.appendChild (envelopeClipPath (pv));

      envelope.setAttribute ('x', (pv.hjog || 0) + 'pt');
      envelope.setAttribute ('y', (pv.vjog || 0) + 'pt');

      page.appendChild (envelope);

      $(pv.section).append (page);

      pv.pageNumber++;
    };

    var addEnvelope = function (fieldList) {
      appendEnvelope (createEnvelope (pv, fieldList));
    };

    //
    //
    //
    $(pv.section).empty ();

    pv.pageNumber = 1;

    _.each (printList, function (shooter) {
      getEnvelopeFunc (shooter, addEnvelope);
    });
  };
  return my;
}(pmelib || {}));
