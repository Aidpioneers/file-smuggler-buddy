import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Calendar, ExternalLink, Users, Timer } from 'lucide-react';
import { marathonData } from '@/data/marathons';

interface MapboxMapProps {
  apiKey?: string;
}

interface MarathonFeature {
  type: string;
  properties: {
    name: string;
    year: number;
    city: string;
    country: string;
    type: string;
    date: string;
    availability: string;
    status: string;
    landingPage: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number];
  };
}

const MapboxMap: React.FC<MapboxMapProps> = ({ apiKey }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedMarathon, setSelectedMarathon] = useState<MarathonFeature | null>(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    if (!mapContainer.current || !apiKey) return;

    mapboxgl.accessToken = apiKey;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [4.9041, 52.3676], // Amsterdam center
      zoom: 4,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      if (!map.current) return;

      // Add marathon data source
      map.current.addSource('marathons', {
        type: 'geojson',
        data: marathonData as any
      });

      // Add clusters
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'marathons',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            'hsl(0, 100%, 67%)',
            100,
            'hsl(217, 91%, 59%)',
            750,
            'hsl(47, 100%, 60%)'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            100,
            30,
            750,
            40
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Add cluster count labels
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'marathons',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Add individual marathon points
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'marathons',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'status'], 'Available'], 'hsl(142, 76%, 36%)',
            ['==', ['get', 'status'], 'Sold Out'], 'hsl(0, 84%, 60%)',
            ['==', ['get', 'status'], 'Checking'], 'hsl(47, 100%, 60%)',
            'hsl(217, 91%, 59%)'
          ],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      // Add marathon labels
      map.current.addLayer({
        id: 'marathon-labels',
        type: 'symbol',
        source: 'marathons',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'city'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1
        }
      });

      // Click handlers
      map.current.on('click', 'unclustered-point', (e) => {
        if (e.features && e.features[0]) {
          setSelectedMarathon(e.features[0] as any as MarathonFeature);
        }
      });

      map.current.on('click', 'clusters', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });

        if (features[0]) {
          const clusterId = features[0].properties!.cluster_id;
          const source = map.current!.getSource('marathons') as mapboxgl.GeoJSONSource;
          
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            
            map.current!.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom
            });
          });
        }
      });

      // Hover effects
      map.current.on('mouseenter', 'unclustered-point', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'unclustered-point', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [apiKey]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Available': return 'default';
      case 'Sold Out': return 'destructive';
      case 'Checking': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    return type.includes('Half') ? <Timer className="w-4 h-4" /> : <Users className="w-4 h-4" />;
  };

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <div className="text-center">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Map requires API key</h3>
          <p className="text-muted-foreground">Please provide a Mapbox access token to view the marathon map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-background">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-10 space-y-4">
        <Card className="w-80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Marathon Map 2025
            </CardTitle>
            <CardDescription>
              Interactive map of available marathon spots worldwide
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search marathons..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
              >
                All
              </Button>
              <Button
                variant={typeFilter === 'full' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('full')}
              >
                Full
              </Button>
              <Button
                variant={typeFilter === 'half' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('half')}
              >
                Half
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Marathon details panel */}
      {selectedMarathon && (
        <div className="absolute top-4 right-4 z-10">
          <Card className="w-80">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{selectedMarathon.properties.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedMarathon.properties.city}, {selectedMarathon.properties.country}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMarathon(null)}
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Badge variant={getStatusVariant(selectedMarathon.properties.status)}>
                  {selectedMarathon.properties.status}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  {getTypeIcon(selectedMarathon.properties.type)}
                  {selectedMarathon.properties.type}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedMarathon.properties.date}</span>
                </div>
                
                <div className="text-sm">
                  <span className="font-medium">Availability: </span>
                  <span className="text-muted-foreground">{selectedMarathon.properties.availability}</span>
                </div>
              </div>

              {selectedMarathon.properties.landingPage && (
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => window.open(selectedMarathon.properties.landingPage, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="w-64">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Sold Out</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>Checking</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MapboxMap;