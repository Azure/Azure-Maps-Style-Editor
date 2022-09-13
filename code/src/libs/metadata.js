import npmurl from 'url'

function loadJSON(url, headers, defaultValue, cb) {
  fetch(url, {
    mode: 'cors',
    headers: headers,
    credentials: "same-origin"
  })
  .then(function(response) {
    return response.json();
  })
  .then(function(body) {
    cb(body)
  })
  .catch(function() {
    console.warn('Cannot fetch metadata for ' + url)
    cb(defaultValue)
  })
}

export function downloadGlyphsMetadata(urlTemplate, headers, cb) {
  if(!urlTemplate) return cb([])

  if (urlTemplate.includes("azure") || urlTemplate.includes("microsoft")) {
    cb([
      "SegoeFrutigerHelveticaMYingHei-Bold",
      "SegoeFrutigerHelveticaMYingHei-Medium",
      "SegoeFrutigerHelveticaMYingHei-Regular",
      "SegoeUi-Bold",
      "SegoeUi-Light",
      "SegoeUi-Regular",
      "SegoeUi-SemiBold",
      "SegoeUi-SemiLight",
      "SegoeUi-SymbolRegular",
      "StandardCondensedSegoeUi-Black",
      "StandardCondensedSegoeUi-Bold",
      "StandardCondensedSegoeUi-Light",
      "StandardCondensedSegoeUi-Regular",
      "StandardFont-Black",
      "StandardFont-Bold",
      "StandardFontCondensed-Black",
      "StandardFontCondensed-Bold",
      "StandardFontCondensed-Light",
      "StandardFontCondensed-Regular",
      "StandardFont-Light",
      "StandardFont-Regular"
    ]);
    return;
  }

  // Special handling because Tileserver GL serves the fontstacks metadata differently
  // https://github.com/klokantech/tileserver-gl/pull/104#issuecomment-274444087
  let urlObj = npmurl.parse(urlTemplate);
  const normPathPart = '/%7Bfontstack%7D/%7Brange%7D.pbf';
  if(urlObj.pathname === normPathPart) {
    urlObj.pathname = '/fontstacks.json';
  } else {
    urlObj.pathname = urlObj.pathname.replace(normPathPart, '.json');
  }
  let url = npmurl.format(urlObj);

  loadJSON(url, headers, [], cb)
}

export function downloadSpriteMetadata(baseUrl, headers, cb) {
  if(!baseUrl) return cb([])
  let urlObj = npmurl.parse(baseUrl);
  urlObj.pathname = urlObj.pathname + ".json";
  loadJSON(npmurl.format(urlObj), headers, {}, glyphs => cb(Object.keys(glyphs)))
}
