import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import MapComponent from '../../components/MapComponent';

export default function LocationPickerScreen({ navigation }) {
    const [location, setLocation] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const getLocation = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                setLoading(false);
                return;
            }

            let currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High
            });
            setLocation(currentLocation);
        } catch (error) {
            setErrorMsg('Error getting location. Please try again.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const saveLocation = async () => {
        if (!location) return;
        setSaving(true);
        try {
            // REVERSE GEOCODE to get human readable address
            const [address] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            const formattedAddress = address 
                ? [
                    address.streetNumber,
                    address.street,
                    address.district || address.suburb,
                    address.city || address.subregion
                  ].filter(Boolean).join(', ') || address.name || `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}`
                : `Lat: ${location.coords.latitude.toFixed(4)}, Lon: ${location.coords.longitude.toFixed(4)}`;

            // CALLBACK MODE: Return to caller if callback exists
            const onSelect = navigation.getParam ? navigation.getParam('onSelect') : null; // Handling navigation v4/v5/v6 differences
            
            // In React Navigation 6/7 (Modern Expo), we check params
            const params = navigation.getState().routes.find(r => r.name === 'LocationPicker')?.params;
            
            if (params?.onSelect) {
                params.onSelect({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    address: formattedAddress
                });
                navigation.goBack();
                return;
            }

            const userDataStr = await AsyncStorage.getItem('userData');
            if (!userDataStr) return;
            const userData = JSON.parse(userDataStr);

            await api.post('/users/update-location', {
                userId: userData.userId,
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });

            Alert.alert('Success', 'Your marketplace position has been updated!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Save Location Error:', error);
            Alert.alert('Error', 'Failed to update location.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tag My Location</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.mapContainer}>
                    <MapComponent 
                        onLocationChange={(region) => {
                            setLocation({
                                coords: {
                                    latitude: region.latitude,
                                    longitude: region.longitude
                                }
                            });
                        }}
                    />
                    {location && (
                        <View style={styles.coordinatesTag}>
                            <Text style={styles.coordText}>Lat: {location.coords.latitude.toFixed(6)} | Lon: {location.coords.longitude.toFixed(6)}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoTitle}>Why set your location?</Text>
                    <Text style={styles.infoDesc}>
                        DhoobiGO uses physical distance to calculate fair delivery fees. By tagging your location, you ensure accurate billing and faster matches with Riders.
                    </Text>
                </View>

                {errorMsg && (
                    <View style={styles.errorBox}>
                        <Ionicons name="alert-circle" size={20} color={Colors.error} />
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.actionBtn, loading && styles.disabledBtn]} 
                    onPress={getLocation}
                    disabled={loading || saving}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="locate" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.actionText}>Capture Current GPS</Text>
                        </>
                    )}
                </TouchableOpacity>

                {location && (
                    <TouchableOpacity 
                        style={[styles.saveBtn, saving && styles.disabledBtn]} 
                        onPress={saveLocation}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveText}>Save Shop/Home Location</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FD' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: Spacing.lg, paddingTop: 60, marginBottom: 24 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
    content: { flex: 1, paddingHorizontal: Spacing.lg },
    mapContainer: { width: '100%', height: 350, borderRadius: 32, overflow: 'hidden', marginBottom: 20, elevation: 4, backgroundColor: '#fff' },
    coordinatesTag: { position: 'absolute', top: 16, alignSelf: 'center', backgroundColor: 'rgba(15,23,42,0.85)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    coordText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    infoBox: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 30, borderWidth: 1, borderColor: '#F1F5F9' },
    infoTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
    infoDesc: { fontSize: 14, color: Colors.textMuted, lineHeight: 22 },
    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, paddingHorizontal: 10 },
    errorText: { color: Colors.error, fontSize: 13, fontWeight: '600' },
    actionBtn: { 
        height: 56, 
        backgroundColor: Colors.primary, 
        borderRadius: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5
    },
    actionText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    saveBtn: { 
        height: 56, 
        backgroundColor: Colors.accent, 
        borderRadius: 16, 
        alignItems: 'center', 
        justifyContent: 'center',
        marginTop: 16,
        elevation: 3
    },
    saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    disabledBtn: { opacity: 0.7 }
});
