import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../theme/typography';
import { Ionicons } from '@expo/vector-icons';

const MapComponent = ({ 
  pickupLocation, 
  deliveryLocation, 
  riderLocation,
  showRoute = false,
  onLocationChange,
  ...props
}) => {
  // Default region (Lahore, Pakistan) if no location provided
  const defaultRegion = {
    latitude: 31.5204,
    longitude: 74.3587,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const initialRegion = pickupLocation ? {
    latitude: pickupLocation.latitude,
    longitude: pickupLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : defaultRegion;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true}
        showsMyLocationButton={true}
        onRegionChangeComplete={(region) => {
          if (onLocationChange && !riderLocation && !pickupLocation) {
             onLocationChange(region);
          }
        }}
        {...props}
      >
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="Pickup Location"
            pinColor={Colors.primary}
          />
        )}

        {deliveryLocation && (
          <Marker
            coordinate={deliveryLocation}
            title="Delivery Location"
            pinColor={Colors.accent}
          />
        )}

        {riderLocation && (
          <Marker
            coordinate={riderLocation}
            title="Rider Status"
          >
            <View style={styles.riderMarker}>
              <View style={styles.riderPulse} />
              <View style={styles.riderInner} />
            </View>
          </Marker>
        )}

        {showRoute && pickupLocation && deliveryLocation && (
          <Polyline
            coordinates={[pickupLocation, deliveryLocation]}
            strokeColor={Colors.primary}
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Visual Crosshair for Picking Location */}
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
  map: { ...StyleSheet.absoluteFillObject },
  riderMarker: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  riderPulse: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(14,165,233,0.3)' },
  riderInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff' },
  crosshairContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  crosshairDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: -2 }
});

export default MapComponent;
