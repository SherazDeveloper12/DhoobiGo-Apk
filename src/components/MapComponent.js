import React, { useRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../theme/typography';
import { Ionicons } from '@expo/vector-icons';

// Free, no-API-key map using Leaflet.js + OpenStreetMap tiles, rendered inside a WebView.
// Props are kept identical to the old react-native-maps version so no screen using
// <MapComponent /> needs to change.
const MapComponent = ({
  pickupLocation,
  deliveryLocation,
  riderLocation,
  showRoute = false,
  onLocationChange,
  ...props
}) => {
  const webviewRef = useRef(null);

  const defaultRegion = { latitude: 31.5204, longitude: 74.3587 }; // Lahore, Pakistan
  const initialCenter = pickupLocation || defaultRegion;

  const html = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        const map = L.map('map', { zoomControl: false, attributionControl: false })
          .setView([${initialCenter.latitude}, ${initialCenter.longitude}], ${pickupLocation ? 16 : 13});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        const primaryColor = '${Colors.primary}';
        const accentColor = '${Colors.accent || Colors.primary}';

        function pinIcon(color) {
          return L.divIcon({
            className: '',
            html: '<div style="background:' + color + ';width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });
        }

        ${pickupLocation ? `L.marker([${pickupLocation.latitude}, ${pickupLocation.longitude}], { icon: pinIcon(primaryColor) }).addTo(map);` : ''}
        ${deliveryLocation ? `L.marker([${deliveryLocation.latitude}, ${deliveryLocation.longitude}], { icon: pinIcon(accentColor) }).addTo(map);` : ''}
        ${riderLocation ? `L.marker([${riderLocation.latitude}, ${riderLocation.longitude}], { icon: pinIcon('#0EA5E9') }).addTo(map);` : ''}

        ${showRoute && pickupLocation && deliveryLocation ? `
          L.polyline([
            [${pickupLocation.latitude}, ${pickupLocation.longitude}],
            [${deliveryLocation.latitude}, ${deliveryLocation.longitude}]
          ], { color: primaryColor, weight: 3, dashArray: '5,5' }).addTo(map);
        ` : ''}

        map.on('moveend', function () {
          const center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            latitude: center.lat,
            longitude: center.lng,
          }));
        });
      </script>
    </body>
    </html>
  `, [pickupLocation, deliveryLocation, riderLocation, showRoute]);

  const handleMessage = (event) => {
    if (!onLocationChange || riderLocation || pickupLocation) return;
    try {
      const region = JSON.parse(event.nativeEvent.data);
      onLocationChange(region);
    } catch (e) {
      // ignore malformed messages
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        {...props}
      />

      {/* Crosshair shown while picking a location (matches old behavior) */}
      {!riderLocation && !pickupLocation && (
        <View style={styles.crosshairContainer} pointerEvents="none">
          <Ionicons name="location" size={36} color={Colors.primary} />
          <View style={styles.crosshairDot} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { height: '100%', width: '100%', borderRadius: 16, overflow: 'hidden', backgroundColor: '#F1F5F9' },
  map: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  crosshairContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  crosshairDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: -2 },
});

export default MapComponent;
