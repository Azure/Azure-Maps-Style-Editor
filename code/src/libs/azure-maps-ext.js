import JSZip from 'jszip'
import cloneDeep from 'lodash.clonedeep'

const apiVersion = "2022-09-01-preview";

const aliasRegex = new RegExp('^[a-zA-Z0-9_-]*$');

const domains = [
  [ "us.atlas.microsoft.com", "United States" ],
  [ "eu.atlas.microsoft.com", "Europe" ]
];

const indoorLayers = new Set([
  "facility",
  "level",
  "unit",
  "vertical_penetration",
  "opening",
  "structure",
  "area_element",
  "line_element",
  "labels_indoor"]);

const baseMapStyles = {
  microsoft_light: "road",
  microsoft_dark: "night",
  microsoft_grayscale_dark: "grayscale_dark",
  microsoft_grayscale_light: "grayscale_light",
  microsoft_shaded_relief: "road_shaded_relief",
  microsoft_high_contrast_dark: "high_contrast_dark",
  microsoft_high_contrast_light: "high_contrast_light",
  microsoft_satellite: "satellite",
  microsoft_satellite_road: "satellite_road_labels"
};

const fakeDomainForSprite = "https://fake.domain.com/for/sprite";

// Azure Maps REST API URLs:
function getTilesetMetadataUrl(domain, tilesetId) { return "https://" + domain + "/tilesets/" + tilesetId + "?api-version=" + apiVersion; }
function createStyleUrl(domain, description) { return "https://" + domain + "/styles?api-version=" + apiVersion + "&styleFormat=azureMapsStyle&description=" + description; }
function listStylesUrl(domain) { return "https://" + domain + "/styles?api-version=" + apiVersion; }
function getStyleUrl(domain, styleName) { return "https://" + domain + "/styles/" + styleName + "?api-version=" + apiVersion + "&styleFormat=azureMapsStyle"; }
function createMapConfigurationUrl(domain, alias, description) { return "https://" + domain + "/styles/mapConfigurations?api-version=" + apiVersion + "&alias=" + alias + "&description=" + description; }
function listMapConfigurationsUrl(domain) { return "https://" + domain + "/styles/mapConfigurations?api-version=" + apiVersion; }
function getMapConfigurationUrl(domain, mapConfigurationName) { return "https://" + domain + "/styles/mapConfigurations/" + mapConfigurationName + "?api-version=" + apiVersion; }
function deleteMapConfigurationUrl(domain, mapConfigurationName) { return "https://" + domain + "/styles/mapConfigurations/" + mapConfigurationName + "?api-version=" + apiVersion; }
function getMapConfigurationStyleUrl(domain, mapConfigurationName, styleName) { return "https://" + domain + "/styles/mapConfigurations/" + mapConfigurationName + "/" + styleName + "?api-version=" + apiVersion; }

// Wrapper functions to issue requests:
function throwIfUserCanceled(canceled) {
  if (canceled) {
    let err = new Error('Canceled by the user.');
    err.reason = 'user';
    throw err;
  }
}

function throwIfBadAlias(alias) {
  let errorMessage = "";
  if (alias.startsWith("microsoft")) {
    errorMessage = "Aliases starting with 'microsoft' are forbidden.";
  }
  if (!aliasRegex.test(alias)) {
    errorMessage = "The specified alias contains invalid characters.";
  }
  if (errorMessage) {
    let err = new Error(errorMessage);
    err.response = {
      error: {
        message: errorMessage
      }
    };
    throw err;
  }
}

async function throwResponseJsonError(response) {
  let err = new Error('Response is not OK. Check console');
  err.response = await response.json();
  console.error(err.response);
  throw err;
}

async function processResponse(response, canceled) {
  throwIfUserCanceled(canceled)
  if (!response.ok) {
    await throwResponseJsonError(response)
  }
  return response;
}

async function processJsonResponse(response, canceled) {
  let processedResponse = await processResponse(response, canceled);
  return processedResponse ? await processedResponse.json() : processedResponse;
}

async function processBlobResponse(response, canceled) {
  let processedResponse = await processResponse(response, canceled);
  return processedResponse ? await processedResponse.blob() : processedResponse;
}

async function getTilesetMetadata(domain, tilesetId, subscriptionKey, canceled) {
  return processJsonResponse( await fetch(getTilesetMetadataUrl(domain, tilesetId), {
    mode: 'cors',
    headers: {'subscription-key': subscriptionKey},
    credentials: "same-origin",
    cache: "reload"
  }), canceled);
}

async function uploadStyleArtifact(url, blob, subscriptionKey, canceled) {
  let response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: {'subscription-key': subscriptionKey},
    credentials: "same-origin",
    body: blob,
    cache: "reload"
  });

  throwIfUserCanceled(canceled)

  if (!response.ok || !response.headers.has("operation-location")) {
    await throwResponseJsonError(response)
  }

  const statusUrl = response.headers.get("operation-location");
  while (true) {
    await delay(1000);
    let statusResponse = await fetch(statusUrl, {
      mode: 'cors',
      headers: {'subscription-key': subscriptionKey},
      credentials: "same-origin",
      cache: "reload"
    });
    throwIfUserCanceled(canceled)
    if (!statusResponse.ok) {
      await throwResponseJsonError(statusResponse)
    }
    if (statusResponse.headers.has('resource-location')) {
      const resourceLocation = statusResponse.headers.get('resource-location');
      let pathArray = resourceLocation.split('?');
      pathArray = pathArray[0].split('/');
      return pathArray[pathArray.length-1]; // return GUID of the newly generated artifact
    }
    const jsonResponse = await statusResponse.json();
    if (jsonResponse.status !== "Running")
    {
      await throwResponseJsonError(statusResponse)
    }
  }
}

function createStyle(domain, description, blob, subscriptionKey, canceled) {
  return uploadStyleArtifact(createStyleUrl(domain, description), blob, subscriptionKey, canceled);
}

async function listStyles(domain, subscriptionKey, canceled) {
  return processJsonResponse( await fetch(listStylesUrl(domain), {
    mode: 'cors',
    headers: {'subscription-key': subscriptionKey},
    credentials: "same-origin",
    cache: "reload"
  }), canceled);
}

async function getStyle(domain, styleName, subscriptionKey, canceled) {
  return processBlobResponse( await fetch(getStyleUrl(domain, styleName), {
    mode: 'cors',
    headers: {'subscription-key': subscriptionKey},
    credentials: "same-origin",
    cache: "reload"
  }), canceled);
}

function createMapConfiguration(domain, alias, description, blob, subscriptionKey, canceled) {
  return uploadStyleArtifact(createMapConfigurationUrl(domain, alias, description), blob, subscriptionKey, canceled);
}

async function listMapConfigurations(domain, subscriptionKey, canceled) {
  return processJsonResponse( await fetch(listMapConfigurationsUrl(domain), {
    mode: 'cors',
    headers: {'subscription-key': subscriptionKey},
    credentials: "same-origin",
    cache: "reload"
  }), canceled);
}

async function getMapConfiguration(domain, mapConfigurationName, subscriptionKey, canceled) {
  return processBlobResponse( await fetch(getMapConfigurationUrl(domain, mapConfigurationName), {
    mode: 'cors',
    headers: {'subscription-key': subscriptionKey},
    credentials: "same-origin",
    cache: "reload"
  }), canceled);
}

async function deleteMapConfiguration(domain, mapConfigurationName, subscriptionKey, canceled) {
  return processResponse( await fetch(deleteMapConfigurationUrl(domain, mapConfigurationName), {
    method: 'DELETE',
    mode: 'cors',
    headers: {'subscription-key': subscriptionKey},
    credentials: "same-origin",
    cache: "reload"
  }), canceled);
}

function ensureMapConfigurationListValidity(mapConfigurationList) {
  return mapConfigurationList;
}

function ensureMapConfigurationValidity(mapConfiguration) {
  return mapConfiguration;
}

function checkBaseMapStyleName (name) {
  let baseMapStyleName = name || "";
  if (!Object.hasOwn(baseMapStyles, baseMapStyleName)) {
    baseMapStyleName = "";
  }
  return baseMapStyleName;
}

async function loadBaseMapStyle(domain, baseMapStyleName, subscriptionKey, canceled) {
  return processJsonResponse( await fetch(getMapConfigurationStyleUrl(domain, "microsoft-maps:default", baseMapStyles[baseMapStyleName]), {
    mode: 'cors',
    headers: {'subscription-key': subscriptionKey},
    credentials: "same-origin",
    cache: "reload"
  }), canceled);
}

async function updateBaseMapForStyle(baseMapStyleName, style, domain, subscriptionKey) {
  // Remove all existing base map sources and layers
  let usedSources = new Set();
  style.layers = style.layers.filter(layer => {
    if (layer.metadata && layer.metadata["azmaps:type"] === "baseMap layer") {
      usedSources.add(layer.source);
      return false;
    }
    return true;
  });
  for (const source of Object.keys(style.sources)) {
    if (usedSources.has(source)) {
      delete style.sources[source];
    }
  }

  baseMapStyleName = checkBaseMapStyleName(baseMapStyleName);
  usedSources = new Set();
  if (baseMapStyleName) {

    // Load base map style
    let baseMapStyle = await loadBaseMapStyle(domain, baseMapStyleName, subscriptionKey);
    baseMapStyle.layers.forEach(layer => {
      layer.metadata = { "azmaps:type": "baseMap layer", ...layer.metadata };
      usedSources.add(layer.source);
    });

    // Add used sources to the style
    usedSources.forEach(source => {
      if (source && Object.hasOwn(baseMapStyle.sources, source)) {
        style.sources[source] = baseMapStyle.sources[source];
      }
    });

    // Add base map layers at the beginning of style layers
    style.layers = baseMapStyle.layers.concat(style.layers);
  }

  return style;
}

class AzureMapsStyle {

  constructor() {
    this._zip = null;
    this._json = null;
    this._jsonFileName = "";
    this._spriteSheets = {};
  }

  get json() { return this._json; }

  get layers() { return this._json?.layers; }

  async load(styleBlob, canceled) {
    let styleZip = await JSZip.loadAsync(styleBlob);

    throwIfUserCanceled(canceled);

    // check file structure
    let jsons = new Set();
    let pngs = new Set();
    for (const zipEntry in styleZip.files) {
      if (zipEntry.toLowerCase().endsWith(".json")) jsons.add(zipEntry.substring(0, zipEntry.length - 5));
      if (zipEntry.toLowerCase().endsWith(".png")) pngs.add(zipEntry.substring(0, zipEntry.length - 4));
    }
    if (jsons.size - pngs.size != 1) {
      let err = new Error("The number of JSON files (" + jsons.size + ") must be greater than PNG files (" + pngs.size + ") exactly by 1");
      throw err;
    }
    for (const imageName of pngs) jsons.delete(imageName);
    if (jsons.size != 1) {
      let err = new Error("There must be a single JSON file being the style. " + jsons.size + " JSON files found.");
      throw err;
    }

    // Load sprite sheets into memory
    let newSpriteSheets = {};
    for (const imageName of pngs) {
      const pixelRatio = imageName.endsWith("@2x") ? "2" : "1";
      newSpriteSheets[pixelRatio + ".json"] = URL.createObjectURL(await styleZip.file(imageName + ".json").async("blob"));
      newSpriteSheets[pixelRatio + ".png"] = URL.createObjectURL(await styleZip.file(imageName + ".png").async("blob"));
      throwIfUserCanceled(canceled);
    }

    const jsonFileName = jsons.values().next().value + ".json";
    const json = JSON.parse(await styleZip.file(jsonFileName).async("string"));

    throwIfUserCanceled(canceled);

    // load style
    this._zip = styleZip;
    this._jsonFileName = jsonFileName;
    this._json = json;
    this._spriteSheets = newSpriteSheets;
  }

  getSpriteUrl(spriteUrl) {
    switch (spriteUrl) {
      case fakeDomainForSprite + ".json":
      case fakeDomainForSprite + "@1x.json":
        return this._spriteSheets["1.json"];
      case fakeDomainForSprite + ".png":
      case fakeDomainForSprite + "@1x.png":
        return this._spriteSheets["1.png"];
      case fakeDomainForSprite + "@2x.json":
        return this._spriteSheets["2.json"];
      case fakeDomainForSprite + "@2x.png":
        return this._spriteSheets["2.png"];
    }
  }

  updateAndGenerateZip(styleJson) {
    this._json = styleJson;
    return this.generateZip();
  }

  generateZip() {
    this._zip.file(this._jsonFileName, JSON.stringify(this._json));
    return this._zip.generateAsync({type: "blob"});
  }
}

class AzureMapsMapConfiguration {

  constructor() {
    this._zip = null;
    this._json = null;
    this._jsonFileName = "";
    this._styleTuples = [];
  }

  get styleTuples() { return this._styleTuples; }

  get configurations() { return this._json.configurations; }

  async load(mapConfigurationBlob, canceled) {
    let mapConfigurationZip = await JSZip.loadAsync(mapConfigurationBlob);

    // check file structure
    let jsons = new Set();
    for (const zipEntry in mapConfigurationZip.files) {
      if (zipEntry.toLowerCase().endsWith(".json")) jsons.add(zipEntry.substring(0, zipEntry.length - 5));
    }
    if (jsons.size != 1) {
      let err = new Error("The number of JSON files (" + jsons.size + ") must be exactly 1 which is map configuration");
      throw err;
    }

    const jsonFileName = jsons.values().next().value + ".json";
    const json = ensureMapConfigurationValidity(JSON.parse(await mapConfigurationZip.file(jsonFileName).async("string")));

    throwIfUserCanceled(canceled);

    // load map configuration
    this._zip = mapConfigurationZip;
    this._jsonFileName = jsonFileName;
    this._json = json;
    this._styleTuples = this.extractConfigTuples();
  }

  generateZip() {
    this._zip.file(this._jsonFileName, JSON.stringify(this._json));
    return this._zip.generateAsync({type: "blob"});
  }

  extractConfigTuples() {
    var configTuples = [];
    for (const configuration of this._json.configurations) {
      const name = configuration.displayName || configuration.name;
      for (const style of configuration.layers) {
        configTuples.push({
          name: configuration.layers.length === 1 ? name : `${name} (Tileset ID: ${style.tilesetId})`,
          tuple: `${style.styleId} + ${style.tilesetId}`,
          baseMap: configuration.baseMap,
          styleId: style.styleId,
          tilesetId: style.tilesetId,
        });
      }
    }
    return configTuples;
  }

  updateConfigTupleDetails(configTupleIndex, details) {
    let {newStyle, newBaseMap, tilesetId, styleId} = details;
    let index = 0;
    for (const configIndex in this._json.configurations) {
      if (Object.hasOwn(this._json.configurations, configIndex)) {
        for (const tupleIndex in this._json.configurations[configIndex].layers) {
          if (Object.hasOwn(this._json.configurations[configIndex].layers, tupleIndex)) {
            if (index == configTupleIndex) {
              if (!newStyle) {
                newStyle = this._json.configurations[configIndex];
              }
              if (newBaseMap !== undefined) {
                newStyle.baseMap = newBaseMap;
              }
              if (tilesetId) {
                newStyle.layers[tupleIndex].tilesetId = tilesetId;
              }
              if (styleId) {
                newStyle.layers[tupleIndex].styleId = styleId;
              }
              this._json.configurations[configIndex] = newStyle;
              this._styleTuples = this.extractConfigTuples();
              return;
            }
            ++index;
          }
        }
      }
    }
  }
}

class AzureMapsTilesetMetadata {
  constructor(tilesetMetadataJson) {
    this._json = tilesetMetadataJson;
  }

  get json() { return this._json; }
  set json(newJson) { this._json = newJson; }

  get minZoom() { return this._json?.minZoom; }

  get maxZoom() { return this._json?.maxZoom; }

  get bbox() { return this._json?.bbox; }
}

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

class AzureMapsExtension {

  constructor() {
    this._subscriptionKey = "";
    this._domain = domains[0][0];
    this._mapConfigurationList = [];
    this._mapConfigurationName = "";
    this._mapConfiguration = new AzureMapsMapConfiguration();
    this._configTupleIndex = "";
    this._style = null;
    this._styleDescription = "";
    this._language = "en-us";
    this._view = "Unified";
    this._tilesetMetadata;
    this._baseMap = "microsoft_light";
  }

  get domains() { return domains; }

  get subscriptionKey() { return this._subscriptionKey; }
  set subscriptionKey(newSubscriptionKey) { this._subscriptionKey = newSubscriptionKey; }

  get domain() { return this._domain; }
  set domain(newDomain) { this._domain = newDomain; }

  get mapConfigurationList() { return this._mapConfigurationList; }
  set mapConfigurationList(newmapConfigurationList) { this._mapConfigurationList = newmapConfigurationList; }

  get mapConfigurationName() { return this._mapConfigurationName; }
  set mapConfigurationName(newmapConfigurationName) { this._mapConfigurationName = newmapConfigurationName; }

  get mapConfiguration() { return this._mapConfiguration; }
  set mapConfiguration(newMapConfiguration) {
    this._mapConfiguration = newMapConfiguration;
  }

  get configTupleIndex() { return this._configTupleIndex; }
  set configTupleIndex(newConfigTupleIndex) { this._configTupleIndex = newConfigTupleIndex; }

  get styleName() { return this._styleName; }
  set styleName(newStyleName) { this._styleName = newStyleName; }

  get styleDescription() { return this._styleDescription; }
  set styleDescription(newStyleDescription) { this._styleDescription = newStyleDescription; }

  get mapConfigurationAlias() { return this._mapConfigurationAlias; }
  set mapConfigurationAlias(newMapConfigurationAlias) { this._mapConfigurationAlias = newMapConfigurationAlias; }

  get mapConfigurationDescription() { return this._mapConfigurationDescription; }
  set mapConfigurationDescription(newMapConfigurationDescription) { this._mapConfigurationDescription = newMapConfigurationDescription; }

  get baseMap() { return this._baseMap; }

  get requestHeaders() { return this._configTupleIndex ? { 'subscription-key': this._subscriptionKey } : {}; }

  transformUrl(url) {
    if (this._configTupleIndex && url)
    {
      if (url.startsWith(fakeDomainForSprite)) {
        return this._style.getSpriteUrl(url);
      }
      let newUrl = url.replace('{{azMapsDomain}}', this._domain).replace('{{azMapsLanguage}}', this._language).replace('{{azMapsView}}', this._view);
      if (!newUrl.includes("api-version")) {
        newUrl = newUrl + "?api-version=" + apiVersion;
      }
      return newUrl;
    }
    else
    {
      return url;
    }
  }

  transformRequest(url, resourceType) {
    return this._configTupleIndex ? {
      url: this.transformUrl(url),
      headers: {'subscription-key': this._subscriptionKey}
    } : {
      url: url
    }
  }

  updateMapConfigList() {
    return listMapConfigurations(this.domain, this.subscriptionKey).then((mapConfigs) => {
      this.mapConfigurationList = mapConfigs.mapConfigurations;
    });
  }

  async createResultingStyle(
    subscriptionKey,
    domain,
    mapConfigurationList,
    mapConfigurationName,
    mapConfiguration,
    configTupleIndex,
    canceled) {

    const configTupleDetails = mapConfiguration.styleTuples[parseInt(configTupleIndex)];
    if (!configTupleDetails) {
      throw new Error('Got invalid style tuple index: ' + configTupleIndex);
    }

    const styleName = configTupleDetails.styleId;
    let style = new AzureMapsStyle();
    await style.load(await getStyle(domain, styleName, subscriptionKey, canceled));

    const tilesetName = configTupleDetails.tilesetId;
    let tilesetMetadata = new AzureMapsTilesetMetadata(await getTilesetMetadata(domain, tilesetName, subscriptionKey, canceled));

    // Get style alias and description
    let styleDescription = "Custom style created in Azure Maps style editor";
    for (const styleMetadata of (await listStyles(domain, subscriptionKey, canceled)).styles) {
      if (styleMetadata.styleId === styleName || styleMetadata.alias === styleName)
      {
        styleDescription = styleMetadata.description;
      }
    }

    // Get map configuration alias and description
    let mapConfigurationAlias = "custom_map_configuration";
    let mapConfigurationDescription = "Custom map configuration created in Azure Maps style editor";
    for (const mapConfigurationEntry of mapConfigurationList) {
      if (mapConfigurationEntry.mapConfigurationId === mapConfigurationName || mapConfigurationEntry.alias === mapConfigurationName)
      {
        mapConfigurationAlias = mapConfigurationEntry.alias;
        mapConfigurationDescription = mapConfigurationEntry.description;
      }
    }

    let resultingStyle = {
      "version": 8,
      "name": cloneDeep(style.json.name) || mapConfiguration.styleTuples[parseInt(configTupleIndex)].tuple,
      "sources": {},
      "sprite": fakeDomainForSprite,
      "glyphs": "https://" + domain + "/styles/glyphs/{fontstack}/{range}.pbf",
      "layers": [],
      "metadata": {
        "azmaps:type": "Azure Maps style",
        "azmaps:bbox": tilesetMetadata?.bbox,
        "azmaps:minZoom": tilesetMetadata?.minZoom,
        "azmaps:maxZoom": tilesetMetadata?.maxZoom,
        ...cloneDeep(style.json.metadata)
      }
    };

    resultingStyle.sources[tilesetName] = {
      type: "vector",
      tiles: [ "https://" + domain + "/map/tile?api-version=2.0&tilesetId=" + tilesetName + "&zoom={z}&x={x}&y={y}" ],
      minzoom: tilesetMetadata?.minZoom,
      maxzoom: tilesetMetadata?.maxZoom
    };

    cloneDeep(style.layers).forEach(layer => {
      // make sure indoor layers are visible
      if ((layer.type !== "fill-extrusion") && layer.metadata && indoorLayers.has(layer.metadata["microsoft.maps:layerGroup"]))
      {
        layer.layout.visibility = "visible"
      }
      layer.source = tilesetName;
      resultingStyle.layers.push(layer);
    });

    // Apply base map
    const baseMap = checkBaseMapStyleName(configTupleDetails.baseMap);
    resultingStyle = await updateBaseMapForStyle(baseMap, resultingStyle, domain, subscriptionKey);

    if (canceled) return null;

    this._subscriptionKey = subscriptionKey;
    this._domain = domain;
    this._mapConfigurationList = mapConfigurationList;
    this._mapConfigurationName = mapConfigurationName;
    this._mapConfiguration = mapConfiguration;
    this._mapConfigurationAlias = mapConfigurationAlias;
    this._mapConfigurationDescription = mapConfigurationDescription;
    this._configTupleIndex = configTupleIndex;
    this._style = style;
    this._styleName = configTupleDetails.name;
    this._styleDescription = styleDescription;
    this._tilesetMetadata = tilesetMetadata;
    this._baseMap = baseMap || "blank";
    return resultingStyle;
  }

  async updateBaseMap(newBaseMapStyleName, style) {
    const baseMapStyleName = checkBaseMapStyleName(newBaseMapStyleName);
    const resultingStyle = await updateBaseMapForStyle(baseMapStyleName, style, this._domain, this._subscriptionKey);
    this._mapConfiguration.updateConfigTupleDetails(this._configTupleIndex, { newBaseMap: baseMapStyleName });
    this._baseMap = baseMapStyleName || "blank";
    return resultingStyle;
  }

  getUpdatedStyle(newStyle) {
    let style = cloneDeep(newStyle);
    if (style.version) delete style.version;
    if (style.glyphs) delete style.glyphs;
    if (style.sprite) delete style.sprite;
    if (style.sources) delete style.sources;
    let layers = [];
    style.layers.forEach(layer => {
      if (layer.metadata && layer.metadata["azmaps:type"] == "baseMap layer") return;

      // make sure indoor layers are hidden
      if ((layer.type !== "fill-extrusion") && layer.metadata && indoorLayers.has(layer.metadata["microsoft.maps:layerGroup"]))
      {
        layer.layout.visibility = "none"
      }
      delete layer.source;

      layers.push(layer);
    });
    style.layers = layers;

    return this._style.updateAndGenerateZip(style);
  }

  async uploadResultingStyle(newStyle, canceled, styleDescription) {
    const blob = await this.getUpdatedStyle(newStyle);

    throwIfUserCanceled(canceled)

    return await createStyle(this._domain, styleDescription, blob, this._subscriptionKey, canceled);
  }

  async getMapConfigurationId(mapConfigurationAlias) {
    if (mapConfigurationAlias) {
      for (const mapConfigurationMetadata of (await listMapConfigurations(this._domain, this._subscriptionKey)).mapConfigurations) {
        if (mapConfigurationMetadata.alias === mapConfigurationAlias) {
          return mapConfigurationMetadata.mapConfigurationId;
        }
      }
    }
    return "";
  }

  async getUpdatedMapConfiguration(styleId) {
    this._mapConfiguration.updateConfigTupleDetails(this._configTupleIndex, { styleId: styleId });
    return this._mapConfiguration.generateZip();
  }

  async uploadResultingMapConfiguration(styleId, canceled, mapConfigurationAlias, mapConfigurationDescription, deleteExistingMapConfig) {
    throwIfBadAlias(mapConfigurationAlias)

    const blob = await this.getUpdatedMapConfiguration(styleId);

    throwIfUserCanceled(canceled)

    const oldMapConfigurationId = await this.getMapConfigurationId(this.mapConfigurationAlias);
    const newMapConfigurationId = await createMapConfiguration(this._domain, mapConfigurationAlias, mapConfigurationDescription, blob, this._subscriptionKey, canceled);

    if (oldMapConfigurationId && deleteExistingMapConfig) {
      await deleteMapConfiguration(this._domain, oldMapConfigurationId, this._subscriptionKey);
    }

    return newMapConfigurationId;
  }
}

export default {
  listMapConfigurations,
  getMapConfiguration,
  ensureMapConfigurationListValidity,
  AzureMapsMapConfiguration,
  AzureMapsExtension
}
