import { useEffect, useMemo, useState } from "react";
import L, { type LatLngExpression, type Map as LeafletMap } from "leaflet";
import {
  CircleMarker,
  LayerGroup,
  LayersControl,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { Zone } from "../../types/domain";
import { useDashboardStore } from "../../store/dashboardStore";
import { buildCommercialCorridors, getConfidenceTier, isCommercialZone } from "../../utils/analytics";
import { CONFIDENCE_COLORS, IMPACT_COLORS } from "../../utils/constants";
import { fmtNum, shortLocation, titleize } from "../../utils/format";
import { MapLegend } from "./MapLegend";

interface HotspotMapProps {
  zones: Zone[];
  allZones: Zone[];
  selectedZone: Zone | null;
}

interface Cluster {
  id: string;
  zones: Zone[];
  lat: number;
  lon: number;
  category: Zone["impactCategory"];
}

function categoryForCluster(zones: Zone[]) {
  if (zones.some((zone) => zone.impactCategory === "High")) return "High";
  if (zones.some((zone) => zone.impactCategory === "Medium")) return "Medium";
  return "Low";
}

function clusterZones(zones: Zone[], map: LeafletMap, zoom: number): Cluster[] {
  const bounds = map.getBounds().pad(0.25);
  const visible = zones.filter((zone) => bounds.contains([zone.lat, zone.lon]));

  if (zoom >= 14) {
    return visible.map((zone) => ({
      id: String(zone.zoneId),
      zones: [zone],
      lat: zone.lat,
      lon: zone.lon,
      category: zone.impactCategory,
    }));
  }

  const gridSize = zoom >= 12 ? 54 : zoom >= 10 ? 76 : 104;
  const buckets = new Map<string, Zone[]>();

  for (const zone of visible) {
    const point = map.project([zone.lat, zone.lon] as LatLngExpression, zoom);
    const key = `${Math.floor(point.x / gridSize)}:${Math.floor(point.y / gridSize)}`;
    buckets.set(key, [...(buckets.get(key) ?? []), zone]);
  }

  return [...buckets.entries()].map(([id, bucket]) => ({
    id,
    zones: bucket,
    lat: bucket.reduce((sum, zone) => sum + zone.lat, 0) / bucket.length,
    lon: bucket.reduce((sum, zone) => sum + zone.lon, 0) / bucket.length,
    category: categoryForCluster(bucket),
  }));
}

function zoneIcon(zone: Zone, selected: boolean) {
  const confidence = getConfidenceTier(zone);
  const volume = Math.min(26, Math.max(12, 8 + Math.log10(zone.violationCount + 1) * 5));
  const color = IMPACT_COLORS[zone.impactCategory];
  const ring = CONFIDENCE_COLORS[confidence];
  return L.divIcon({
    className: "hotspot-div-icon",
    html: `<span class="hotspot-pin ${selected ? "selected" : ""}" style="--pin-size:${volume}px;--pin-color:${color};--ring-color:${ring}"></span>`,
    iconSize: [volume + 14, volume + 14],
    iconAnchor: [(volume + 14) / 2, (volume + 14) / 2],
  });
}

function clusterIcon(cluster: Cluster) {
  const size = Math.min(46, Math.max(28, 22 + Math.log(cluster.zones.length + 1) * 7));
  const color = IMPACT_COLORS[cluster.category];
  return L.divIcon({
    className: "hotspot-div-icon",
    html: `<span class="cluster-pin" style="--cluster-size:${size}px;--cluster-color:${color}">${cluster.zones.length}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function ZoneTooltip({ zone }: { zone: Zone }) {
  return (
    <div className="w-64 text-xs">
      <div className="font-semibold text-zinc-950">{shortLocation(zone.location, 2)}</div>
      <div className="mt-1 grid grid-cols-2 gap-2 text-zinc-600">
        <span>Zone #{zone.zoneId}</span>
        <span>Rank #{zone.priorityRank}</span>
        <span>Impact {zone.impactScore}</span>
        <span>{zone.impactCategory}</span>
        <span>{fmtNum(zone.violationCount)} stops</span>
        <span>{getConfidenceTier(zone)} confidence</span>
      </div>
      <div className="mt-2 text-zinc-600">Road: {titleize(zone.roadType)}</div>
      <div className="mt-1 text-zinc-600">Commercial: {titleize(zone.footfallCategory)}</div>
      <div className="mt-2 font-medium text-zinc-900">Patrol: {zone.patrolWindow}</div>
      {zone.isEmerging ? <div className="mt-1 font-semibold text-amber-700">Emerging hotspot</div> : null}
    </div>
  );
}

function MapStoreSync({ selectedZone }: { selectedZone: Zone | null }) {
  const setMapState = useDashboardStore((state) => state.setMapState);
  const mapState = useDashboardStore((state) => state.mapState);
  const map = useMap();

  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      setMapState({ center: [center.lat, center.lng], zoom: map.getZoom() });
    },
    zoomend: () => {
      const center = map.getCenter();
      setMapState({ center: [center.lat, center.lng], zoom: map.getZoom() });
    },
  });

  useEffect(() => {
    if (selectedZone) {
      map.flyTo([selectedZone.lat, selectedZone.lon], Math.max(map.getZoom(), 13), { duration: 0.6 });
    }
  }, [map, selectedZone?.zoneId]);

  useEffect(() => {
    map.setView(mapState.center, mapState.zoom, { animate: false });
  }, []);

  return null;
}

function ClusteredHotspots({ zones, selectedZone }: { zones: Zone[]; selectedZone: Zone | null }) {
  const map = useMap();
  const selectZone = useDashboardStore((state) => state.selectZone);
  const [viewVersion, setViewVersion] = useState(0);

  useMapEvents({
    moveend: () => setViewVersion((value) => value + 1),
    zoomend: () => setViewVersion((value) => value + 1),
  });

  const clusters = useMemo(() => clusterZones(zones, map, map.getZoom()), [map, zones, viewVersion]);

  return (
    <LayerGroup>
      {clusters.map((cluster) => {
        const position: LatLngExpression = [cluster.lat, cluster.lon];
        if (cluster.zones.length === 1) {
          const zone = cluster.zones[0];
          const selected = selectedZone?.zoneId === zone.zoneId;
          return (
            <Marker key={zone.zoneId} position={position} icon={zoneIcon(zone, selected)} eventHandlers={{ click: () => selectZone(zone) }}>
              <Tooltip direction="top" offset={[0, -8]} opacity={1} className="custom-leaflet-tooltip">
                <ZoneTooltip zone={zone} />
              </Tooltip>
            </Marker>
          );
        }
        return (
          <Marker
            key={cluster.id}
            position={position}
            icon={clusterIcon(cluster)}
            eventHandlers={{
              click: () => map.flyTo(position, Math.min(15, map.getZoom() + 2), { duration: 0.45 }),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={1} className="custom-leaflet-tooltip">
              <div className="text-xs">
                <div className="font-semibold text-zinc-950">{cluster.zones.length} zones</div>
                <div className="mt-1 text-zinc-600">{cluster.zones.filter((zone) => zone.impactCategory === "High").length} high impact</div>
                <div className="text-zinc-600">{fmtNum(cluster.zones.reduce((sum, zone) => sum + zone.violationCount, 0))} violations</div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </LayerGroup>
  );
}

function HeatmapLayer({ zones }: { zones: Zone[] }) {
  return (
    <LayerGroup>
      {zones.map((zone) => (
        <CircleMarker
          key={`heat-${zone.zoneId}`}
          center={[zone.lat, zone.lon]}
          radius={Math.min(32, Math.max(8, Math.log10(zone.violationCount + 1) * 8))}
          pathOptions={{
            color: IMPACT_COLORS[zone.impactCategory],
            fillColor: IMPACT_COLORS[zone.impactCategory],
            fillOpacity: 0.12,
            opacity: 0.12,
            weight: 1,
          }}
        />
      ))}
    </LayerGroup>
  );
}

function ZoneCircleOverlay({ zones, selectedZone }: { zones: Zone[]; selectedZone: Zone | null }) {
  const selectZone = useDashboardStore((state) => state.selectZone);
  return (
    <LayerGroup>
      {zones.map((zone) => (
        <CircleMarker
          key={`overlay-${zone.zoneId}`}
          center={[zone.lat, zone.lon]}
          radius={selectedZone?.zoneId === zone.zoneId ? 9 : 6}
          eventHandlers={{ click: () => selectZone(zone) }}
          pathOptions={{
            color: IMPACT_COLORS[zone.impactCategory],
            fillColor: IMPACT_COLORS[zone.impactCategory],
            fillOpacity: 0.2,
            opacity: 0.8,
            weight: selectedZone?.zoneId === zone.zoneId ? 3 : 1.5,
          }}
        >
          <Tooltip direction="top" opacity={1} className="custom-leaflet-tooltip">
            <ZoneTooltip zone={zone} />
          </Tooltip>
        </CircleMarker>
      ))}
    </LayerGroup>
  );
}

function CommercialCorridorLayer({ zones }: { zones: Zone[] }) {
  const corridors = useMemo(() => buildCommercialCorridors(zones), [zones]);
  return (
    <LayerGroup>
      {corridors.map((corridor) => (
        <Polyline
          key={corridor.roadName}
          positions={corridor.zones.map((zone) => [zone.lat, zone.lon] as LatLngExpression)}
          pathOptions={{ color: "#0f766e", opacity: 0.72, weight: 4 }}
        >
          <Tooltip sticky opacity={1} className="custom-leaflet-tooltip">
            <div className="text-xs">
              <div className="font-semibold text-zinc-950">{corridor.roadName}</div>
              <div className="mt-1 text-zinc-600">{corridor.zones.length} commercial/transit zones</div>
              <div className="text-zinc-600">{fmtNum(corridor.totalViolations)} violations</div>
            </div>
          </Tooltip>
        </Polyline>
      ))}
      {zones.filter(isCommercialZone).map((zone) => (
        <CircleMarker
          key={`commercial-${zone.zoneId}`}
          center={[zone.lat, zone.lon]}
          radius={4}
          pathOptions={{ color: "#0f766e", fillColor: "#0f766e", fillOpacity: 0.7, weight: 1 }}
        />
      ))}
    </LayerGroup>
  );
}

export function HotspotMap({ zones, allZones, selectedZone }: HotspotMapProps) {
  const mapState = useDashboardStore((state) => state.mapState);
  const highPriorityZones = useMemo(() => zones.filter((zone) => zone.impactCategory === "High"), [zones]);
  const emergingZones = useMemo(() => zones.filter((zone) => zone.isEmerging), [zones]);

  return (
    <div className="relative h-[68vh] min-h-[520px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm" data-tour="map">
      <MapContainer center={mapState.center} zoom={mapState.zoom} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapStoreSync selectedZone={selectedZone} />
        <LayersControl position="topright">
          <LayersControl.Overlay checked name="Hotspot clusters">
            <ClusteredHotspots zones={zones} selectedZone={selectedZone} />
          </LayersControl.Overlay>
          <LayersControl.Overlay checked name="Heatmap overlay">
            <HeatmapLayer zones={zones} />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Commercial corridor overlay">
            <CommercialCorridorLayer zones={zones} />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="Emerging hotspot overlay">
            <ZoneCircleOverlay zones={emergingZones} selectedZone={selectedZone} />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="High-priority zone overlay">
            <ZoneCircleOverlay zones={highPriorityZones} selectedZone={selectedZone} />
          </LayersControl.Overlay>
          <LayersControl.Overlay name="All commercial/transit zones">
            <ZoneCircleOverlay zones={allZones.filter(isCommercialZone)} selectedZone={selectedZone} />
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
      <MapLegend zones={zones} />
    </div>
  );
}
