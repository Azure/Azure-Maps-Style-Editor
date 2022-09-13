export function formatLayerId (id) {
  return id === "" ? "[empty_string]" : `'${id}'`;
}

export function isLayerSelectable(layer) {
  return !(layer.metadata && layer.metadata["azmaps:type"] == "baseMap layer");
}