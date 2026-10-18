// Executed inside the local WebView, before the MapLibre map is constructed.
// Only individual requested tiles cross the bridge; no whole-region Base64 payload.
export const exploreProtocolScript = String.raw`
  const explorePending = new Map();
  let exploreSequence = 0;
  let exploreRevision = 0;
  let exploreWants3D = true;
  let exploreTerrainAvailable = true;
  function explorePost(message) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  window.exploreTileResult = function(id, base64, error) {
    const task = explorePending.get(id);
    if (!task) return;
    explorePending.delete(id);
    clearTimeout(task.timer);
    task.signal.removeEventListener('abort', task.abort);
    if (error) { task.reject(new Error(error)); return; }
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      task.resolve({ data: bytes.buffer });
    } catch (_) { task.reject(new Error('Không đọc được tile đã lưu.')); }
  };
  maplibregl.addProtocol('trekgo', function(params, controller) {
    return new Promise(function(resolve, reject) {
      const id = ++exploreSequence;
      const abort = function() {
        const task = explorePending.get(id);
        if (!task) return;
        explorePending.delete(id);
        clearTimeout(task.timer);
        controller.signal.removeEventListener('abort', abort);
        explorePost({ type: 'EXPLORE_TILE_CANCEL', id: id });
        reject(new Error('Tile request cancelled'));
      };
      if (controller.signal.aborted) { reject(new Error('Tile request cancelled')); return; }
      const timer = setTimeout(abort, 90000);
      explorePending.set(id, {resolve: resolve, reject: reject, timer: timer, signal: controller.signal, abort: abort});
      controller.signal.addEventListener('abort', abort, { once: true });
      explorePost({ type: 'EXPLORE_TILE', id: id, url: params.url });
    });
  });
  window.reportExploreViewport = function() {
    const center = map.getCenter();
    explorePost({type:'EXPLORE_VIEWPORT',center:[center.lng,center.lat]});
  };
  window.setExploreConnection = function(offline, revision, availableMaxZoom) {
    const limit = offline ? Math.min(16, availableMaxZoom == null ? 16 : availableMaxZoom) : 18;
    map.setMaxZoom(limit);
    if (offline && map.getZoom() > limit) map.easeTo({ zoom: limit, duration: 350 });
    if (revision === exploreRevision) return;
    exploreRevision = revision;
    const satellite = map.getSource('satellite-tiles');
    const dem = map.getSource('terrain-dem-source');
    if (satellite && satellite.setTiles) satellite.setTiles(['trekgo://satellite/{z}/{x}/{y}?revision=' + revision]);
    if (dem && dem.setTiles) dem.setTiles(['trekgo://dem/{z}/{x}/{y}?revision=' + revision]);
    window.reportExploreViewport();
  };
  window.setExploreTerrainAvailable = function(available) {
    if (available === exploreTerrainAvailable) return;
    exploreTerrainAvailable = available;
    if (!map.getSource('terrain-dem-source')) return;
    map.setTerrain(available && exploreWants3D ? {source:'terrain-dem-source',exaggeration:2.0} : null);
    if (!available) map.easeTo({pitch:0,duration:350});
  };
`;
