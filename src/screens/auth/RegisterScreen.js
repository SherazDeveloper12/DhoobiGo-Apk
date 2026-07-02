import { useEffect, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { authService, orderService, userService, getImageUrl } from '../../services/api';
import { PrimaryButton } from '../../components/UIComponents';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import MapComponent from '../../components/MapComponent';

export default function RegisterScreen({ navigation }) {
  const [role, setRole] = useState('Customer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState(null);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [cnic, setCnic] = useState('');
  const [shopName, setShopName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showHelp, setShowHelp] = useState(false);

  // New Compliance Fields
  const [fatherName, setFatherName] = useState('');
  const [landmark, setLandmark] = useState('');
  const [ntn, setNtn] = useState('');
  const [referenceNumbers, setReferenceNumbers] = useState('');
  const [dhobiType, setDhobiType] = useState(0); // 0: Normal, 1: FullTime, 2: Premium
  const [riderType, setRiderType] = useState(0); // 0: Normal, 1: Linked
  const [selectedDhobi, setSelectedDhobi] = useState(null);
  const [dhobiSearchQuery, setDhobiSearchQuery] = useState('');
  const [dhobiResults, setDhobiResults] = useState([]);
  const [showDhobiSearch, setShowDhobiSearch] = useState(false);
  const [searchingDhobi, setSearchingDhobi] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Verification Assets
  const [profileImage, setProfileImage] = useState(null);
  const [cnicImage, setCnicImage] = useState(null);
  const [selfieId, setSelfieId] = useState(null);
  const [policeLetter, setPoliceLetter] = useState(null);
  const [drivingLicense, setDrivingLicense] = useState(null);
  const [vehicleReg, setVehicleReg] = useState(null);
  const [vehicleImg, setVehicleImg] = useState(null);
  const [billImg, setBillImg] = useState(null);
  const [equipmentImg, setEquipmentImg] = useState(null);
  const [licenseImage, setLicenseImage] = useState(null);

  const roles = ['Customer', 'Dhobi', 'Rider'];

  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Gallery access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const uploadFile = async (uri) => {
    if (!uri) return null;
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : `image`;
    const formData = new FormData();
    formData.append('file', { uri, name: filename, type });
    try {
      const res = await orderService.uploadImage(formData);
      return res.data.imageUrl || res.data.ImageUrl;
    } catch (e) {
      return null;
    }
  };

  const formatCNIC = (text) => {
    let cleaned = text.replace(/[^0-9]/g, "");
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = cleaned.substring(0, 5) + "-" + cleaned.substring(5, 12);
    }
    if (cleaned.length > 12) {
      formatted = formatted + "-" + cleaned.substring(12, 13);
    }
    return formatted.substring(0, 15);
  };

  const handleCurrentLocation = async () => {
    setSearchingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location access is required.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCoords({ latitude, longitude });
      
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`, {
        headers: { 'User-Agent': 'DhoobiGO-App' }
      });
      const data = await response.json();
      const addr = data.address || {};
      const cleanAddress = [
        addr.road,
        addr.neighbourhood || addr.suburb || addr.residential,
        addr.city || addr.town || addr.village
      ].filter(Boolean).join(', ') || data.display_name;
      
      setAddress(cleanAddress);
    } catch (e) {
      Alert.alert('Error', 'Could not fetch current location.');
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleDhobiSearch = useCallback((text) => {
    setDhobiSearchQuery(text);
    
    // Clear existing timeout using a ref or local closure to prevent "shaking"
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(async () => {
      if (text.length > 2) {
        setSearchingDhobi(true);
        try {
          // Use the imported userService directly
          const res = await userService.searchDhobis(text);
          setDhobiResults(res.data || []);
        } catch (e) {
          console.error('[SEARCH ERROR]', e);
          setDhobiResults([]);
        } finally {
          setSearchingDhobi(false);
        }
      } else {
        setDhobiResults([]);
      }
    }, 600); // Increased delay to 600ms for stability
    
    setSearchTimeout(timeout);
  }, [searchTimeout]);

  const handleRegister = async () => {
    setErrors({});
    const newErrors = {};
    if (!name) newErrors.name = 'Required';
    
    if (!email) {
      newErrors.email = 'Required';
    } else if (!email.toLowerCase().endsWith('@gmail.com')) {
      newErrors.email = 'Must be a valid @gmail.com address';
    }

    if (!password) newErrors.password = 'Required';

    if (role !== 'Customer') {
      if (!cnic || cnic.length < 15) newErrors.cnic = 'Valid CNIC required';
      if (!profileImage) newErrors.profile = 'Profile photo required';
      if (!cnicImage) newErrors.cnicImage = 'CNIC photo required';
      if (!selfieId) newErrors.selfieId = 'Selfie required';
      if (!policeLetter) newErrors.police = 'Police verify required';
      
      if (role === 'Dhobi') {
        if (!fatherName) newErrors.father = 'Father Name required';
        if (!landmark) newErrors.landmark = 'Landmark required';
        
        // Full-Time and Premium requirements
        if (dhobiType > 0) {
            if (!shopName) newErrors.shop = 'Shop Name required';
            if (!ntn) newErrors.ntn = 'NTN Number required';
            if (!licenseImage) newErrors.license = 'Business license required';
        }

        if (!billImg) newErrors.bill = 'Utility Bill required';
        if (!equipmentImg) newErrors.equip = 'Equipment photo required';
      }

      if (role === 'Rider') {
        if (!fatherName) newErrors.father = 'Father Name required';
        if (!vehicleNumber) newErrors.vn = 'License Plate required';
        if (!drivingLicense) newErrors.dl = 'License required';
        if (!vehicleReg) newErrors.vr = 'Registration required';
        if (!vehicleImg) newErrors.vi = 'Vehicle Photo required';
        if (riderType === 1 && !selectedDhobi) newErrors.dhobiLink = 'Must select a shop';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert(
        'Registration Incomplete', 
        'We noticed some mandatory information is missing or incorrectly formatted. Please review the highlighted fields below and provide the required documentation to proceed.'
      );
      return;
    }

    setLoading(true);
    try {
      const pUrl = await uploadFile(profileImage);
      const cUrl = await uploadFile(cnicImage);
      const sUrl = await uploadFile(selfieId);
      const polUrl = await uploadFile(policeLetter);
      
      let dlUrl, vrUrl, viUrl, ebUrl, eqUrl, blUrl;
      if (role === 'Rider') {
        dlUrl = await uploadFile(drivingLicense);
        vrUrl = await uploadFile(vehicleReg);
        viUrl = await uploadFile(vehicleImg);
      } else if (role === 'Dhobi') {
        ebUrl = await uploadFile(billImg);
        eqUrl = await uploadFile(equipmentImg);
        blUrl = await uploadFile(licenseImage);
      }

      const roleMap = { 'Customer': 0, 'Dhobi': 1, 'Rider': 2 };

      const registerResp = await authService.register({
        FullName: name, Email: email, Password: password, PhoneNumber: phone,
        Address: address || 'No address set', 
        Latitude: coords?.latitude || 0,
        Longitude: coords?.longitude || 0,
        Role: roleMap[role],
        CnicNumber: cnic, ShopName: shopName, VehicleNumber: vehicleNumber,
        ProfilePictureUrl: pUrl, CnicImageUrl: cUrl, SelfieWithIdUrl: sUrl, PoliceVerificationUrl: polUrl,
        DrivingLicenseUrl: dlUrl, VehicleRegistrationUrl: vrUrl, VehicleImageUrl: viUrl,
        ElectricityBillUrl: ebUrl, EquipmentImageUrl: eqUrl, BusinessLicenseUrl: blUrl,
        FatherName: fatherName, Landmark: landmark, NtnNumber: ntn, ReferenceNumbers: referenceNumbers,
        DhobiType: role === 'Dhobi' ? dhobiType : null,
        RiderType: role === 'Rider' ? riderType : null
      });

      if (role === 'Rider' && riderType === 1 && selectedDhobi) {
        await userService.requestRiderLink({
          riderId: registerResp.data.userId,
          dhobiId: selectedDhobi.userId
        });
      }

      setLoading(false);
      const successMsg = role === 'Customer' 
        ? 'Account created successfully! You can now log in.' 
        : 'Application submitted for admin review!';
      Alert.alert('Success', successMsg, [{ text: 'OK', onPress: () => navigation.replace('Login') }]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Registration Failed', error.response?.data?.Message || 'Network error');
    }
  };

  const UploadCard = ({ icon, label, img, onPress, error }) => (
    <View style={{ width: '47%' }}>
      <TouchableOpacity style={[styles.uploadCard, { width: '100%' }, error && styles.uploadCardError]} onPress={() => { onPress(); setErrors(prev => ({...prev, [label]: null})); }}>
        {img ? <Image source={{ uri: img }} style={styles.previewImg} /> : (
          <>
            <Ionicons name={icon} size={20} color={error ? Colors.error : Colors.primary} />
            <Text style={[styles.uploadText, error && { color: Colors.error }]}>{label} *</Text>
          </>
        )}
      </TouchableOpacity>
      {error && <Text style={{ color: Colors.error, fontSize: 10, marginTop: 4, textAlign: 'center', fontWeight: 'bold' }}>{error}</Text>}
    </View>
  );

  const UrduHelp = () => (
     <View style={styles.helpOverlay}>
        <View style={styles.helpModal}>
           <View style={styles.helpHeader}>
              <Text style={styles.helpTitle}>رجسٹریشن کی رہنمائی</Text>
              <TouchableOpacity onPress={() => setShowHelp(false)}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
           </View>
           <ScrollView style={styles.helpScroll}>
              <HelpItem num="1" title="تصویر (Profile Picture):" text="اپنی ایک صاف تصویر اپ لوڈ کریں جس میں آپ کا چہرہ واضع ہو۔" />
              <HelpItem num="2" title="والد کا نام (Father Name):" text="اپنے والد کا نام درج کریں، یہ پارٹنر رجسٹریشن کے لیے لازمی ہے۔" />
              <HelpItem num="3" title="شناختی کارڈ (CNIC):" text="شناختی کارڈ کے سامنے والے حصے کی تصویر اور شناختی کارڈ نمبر درج کریں۔" />
              <HelpItem num="4" title="سیلفی شناختی کارڈ کے ساتھ:" text="اپنا شناختی کارڈ ہاتھ میں پکڑ کر اپنی ایک سیلفی لیں جس میں کارڈ واضع ہو۔" />
              <HelpItem num="5" title="قریبی مشہور جگہ (Landmark):" text="اپنے گھر یا دکان کے قریب کسی مشہور جگہ کا نام لکھیں تاکہ رائیڈر آسانی سے پہنچ سکے۔" />
              <HelpItem num="6" title="پولیس تصدیقی لیٹر:" text="اپنے مقامی تھانے سے حاصل کردہ تصدیقی لیٹر کی تصویر۔" />
              
              {role === 'Dhobi' ? (
                <>
                  <HelpItem num="7" title="بجلی کا بل (Electricity Bill):" text="دکان یا گھر کے حالیہ بجلی کے بل کی تصویر اپ لوڈ کریں۔" />
                  <HelpItem num="8" title="دکان / سامان کی تصویر:" text="اپنی دکان اور واشنگ مشینوں کی ایک واضع تصویر کھینچیں۔" />
                  {dhobiType > 0 && <HelpItem num="9" title="NTN اور دکان کا ثبوت:" text="اگر آپ کی دکان ہے تو اپنا NTN نمبر اور دکان کے قانونی ثبوت کی تصویر اپ لوڈ کریں۔" />}
                </>
              ) : (
                <>
                  <HelpItem num="7" title="ڈرائیونگ لائسنس (License):" text="اپنے اصل ڈرائیونگ لائسنس کی واضع تصویر اپ لوڈ کریں۔" />
                  <HelpItem num="8" title="بائیک کے کاغذات (Bike Book):" text="بائیک کی رجسٹریشن بک کے پہلے صفحے کی صاف تصویر لیں۔" />
                  <HelpItem num="9" title="بائیک کی اپنی تصویر:" text="اپنی بائیک کی ایک مکمل تصویر کھینچیں جس میں نمبر پلیٹ واضع ہو۔" />
                </>
              )}
           </ScrollView>
           <View style={{ padding: 20, paddingTop: 0 }}>
             <TouchableOpacity style={styles.closeHelpBtn} onPress={() => setShowHelp(false)}>
               <Text style={styles.closeHelpText}>سمجھ آگئی</Text>
             </TouchableOpacity>
           </View>
        </View>
     </View>
  );

  const HelpItem = ({ num, title, text }) => (
    <View style={styles.helpItem}>
       <View style={styles.helpNum}><Text style={styles.helpNumText}>{num}</Text></View>
       <View style={{ flex: 1 }}>
          <Text style={styles.helpItemTitle}>{title}</Text>
          <Text style={styles.helpItemText}>{text}</Text>
       </View>
    </View>
  );


  return (
    <LinearGradient colors={Colors.gradientWhite} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={Colors.textPrimary} /></TouchableOpacity>
            <Text style={styles.title}>Partner Onboarding</Text>
            <Text style={styles.subtitle}>Rigorous verification for high standards</Text>
          </View>

          <View style={styles.roleRow}>
            {roles.map((r) => (
              <TouchableOpacity key={r} onPress={() => { setRole(r); setErrors({}); }} style={[styles.roleTab, role === r && styles.roleTabActive]}>
                <Text style={[styles.roleTabText, role === r && styles.roleTabTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {role !== 'Customer' && (
            <View style={[styles.roleRow, { marginTop: -12, marginBottom: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9', height: 44 }]}>
              {(role === 'Dhobi' ? ['Normal / Part-Time', 'Full-Time Shop', 'Premium'] : ['Independent Rider', 'Linked Rider']).map((type, idx) => (
                <TouchableOpacity 
                  key={type} 
                  onPress={() => { role === 'Dhobi' ? setDhobiType(idx) : setRiderType(idx); setErrors({}); }} 
                  style={[styles.roleTab, (role === 'Dhobi' ? dhobiType : riderType) === idx && { backgroundColor: Colors.primary + '10' }]}
                >
                  <Text style={[styles.roleTabText, { fontSize: 10 }, (role === 'Dhobi' ? dhobiType : riderType) === idx && { color: Colors.primary }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {role === 'Rider' && riderType === 1 && (
            <View style={[styles.card, { marginBottom: 24, paddingVertical: 12, borderColor: Colors.primary, borderWidth: 1 }]}>
               <TouchableOpacity 
                 style={[styles.inputGroup, { marginBottom: 0, borderBottomWidth: 0 }]} 
                 onPress={() => setShowDhobiSearch(true)}
               >
                 <Ionicons name="business" size={24} color={Colors.primary} />
                 <View style={{ flex: 1, paddingLeft: 12 }}>
                   <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: '700' }}>EMPLOYER SHOP</Text>
                   <Text style={{ color: selectedDhobi ? Colors.textPrimary : Colors.textMuted, fontSize: 16, fontWeight: '800' }}>
                     {selectedDhobi ? selectedDhobi.shopName : 'Tap to Search Shop *'}
                   </Text>
                 </View>
                 <Ionicons name="search" size={20} color={Colors.primary} />
               </TouchableOpacity>
               {errors.dhobiLink && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, textAlign: 'center', fontWeight: 'bold' }}>{errors.dhobiLink}</Text>}
            </View>
          )}

          <View style={styles.card}>
            {role !== 'Customer' && (
              <View style={styles.profileSection}>
                 <TouchableOpacity onPress={() => pickImage(setProfileImage)} style={[styles.avatarPicker, errors.profile && { borderColor: Colors.error }]}>
                   {profileImage ? <Image source={{ uri: profileImage }} style={styles.avatarImg} /> : <Ionicons name="camera" size={32} color={errors.profile ? Colors.error : Colors.textMuted} />}
                 </TouchableOpacity>
                 <Text style={[styles.avatarLabel, errors.profile && { color: Colors.error }]}>Professional Headshot *</Text>
                 {errors.profile && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.profile}</Text>}
              </View>
            )}

            <View style={{ marginBottom: 18 }}>
              <View style={[styles.inputGroup, { marginBottom: 0 }, errors.name && { borderBottomColor: Colors.error }]}><Ionicons name="person-outline" size={20} color={errors.name ? Colors.error : Colors.textMuted} /><TextInput style={styles.input} placeholder="Full Name *" value={name} onChangeText={(t) => {setName(t); setErrors(prev=>({...prev, name: null}))}} /></View>
              {errors.name && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.name}</Text>}
            </View>

            <View style={{ marginBottom: 18 }}>
              <View style={[styles.inputGroup, { marginBottom: 0 }, errors.email && { borderBottomColor: Colors.error }]}><Ionicons name="mail-outline" size={20} color={errors.email ? Colors.error : Colors.textMuted} /><TextInput style={styles.input} placeholder="Email *" value={email} onChangeText={(t) => {setEmail(t); setErrors(prev=>({...prev, email: null}))}} /></View>
              {errors.email && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.email}</Text>}
            </View>

            <View style={{ marginBottom: 18 }}>
              <View style={[styles.inputGroup, { marginBottom: 0 }, errors.phone && { borderBottomColor: Colors.error }]}><Ionicons name="call-outline" size={20} color={errors.phone ? Colors.error : Colors.textMuted} /><TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} /></View>
            </View>

            {role !== 'Customer' && (
              <View style={{ marginBottom: 18 }}>
                <View style={[styles.inputGroup, { marginBottom: 12 }, errors.address && { borderBottomColor: Colors.error }]}>
                  <Ionicons name="location-outline" size={20} color={Colors.textMuted} />
                  <TextInput 
                    style={styles.input} 
                    placeholder={role === 'Dhobi' ? "Shop Address *" : "Residential Address *"} 
                    value={address} 
                    onChangeText={setAddress} 
                  />
                  <TouchableOpacity onPress={handleCurrentLocation}>
                    {searchingLocation ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name="locate" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                </View>
                
                <View style={styles.mapContainer}>
                  <MapComponent 
                    pickupLocation={coords} 
                    onLocationChange={(region) => {
                      setCoords({ latitude: region.latitude, longitude: region.longitude });
                    }}
                  />
                  {!coords && (
                    <View style={styles.mapOverlay}>
                      <Text style={styles.mapOverlayText}>Tap 'Locate' or drag map to set your {role === 'Dhobi' ? 'Shop' : 'Home'} location</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.mapHint}>This location will be used to show your services to nearby customers.</Text>
              </View>
            )}

            <View style={{ marginBottom: 18 }}>
              <View style={[styles.inputGroup, { marginBottom: 0 }, errors.password && { borderBottomColor: Colors.error }]}><Ionicons name="lock-closed-outline" size={20} color={errors.password ? Colors.error : Colors.textMuted} /><TextInput style={styles.input} placeholder="Password *" value={password} onChangeText={(t) => {setPassword(t); setErrors(prev=>({...prev, password: null}))}} secureTextEntry /></View>
              {errors.password && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.password}</Text>}
            </View>

            {role !== 'Customer' && (
              <View style={{ marginBottom: 18 }}>
                <View style={[styles.inputGroup, { marginBottom: 0 }, errors.father && { borderBottomColor: Colors.error }]}><Ionicons name="people-outline" size={20} color={errors.father ? Colors.error : Colors.textMuted} /><TextInput style={styles.input} placeholder="Father Name *" value={fatherName} onChangeText={(t) => {setFatherName(t); setErrors(prev=>({...prev, father: null}))}} /></View>
                {errors.father && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.father}</Text>}
              </View>
            )}

            {role !== 'Customer' && (
              <View style={styles.verifySection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>KYC & Assets Verification</Text>
                  <TouchableOpacity onPress={() => setShowHelp(true)} style={styles.helpTrigger}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.helpTriggerText}>رہنمائی حاصل کریں</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={{ marginBottom: 18 }}>
                  <View style={[styles.inputGroup, { marginBottom: 0 }, errors.cnic && { borderBottomColor: Colors.error }]}>
                    <Ionicons name="card-outline" size={20} color={errors.cnic ? Colors.error : Colors.textMuted} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="CNIC (e.g. 12345-1234567-1) *" 
                      value={cnic} 
                      onChangeText={(text) => {setCnic(formatCNIC(text)); setErrors(prev=>({...prev, cnic: null}));}}
                      keyboardType="numeric"
                      maxLength={15}
                    />
                  </View>
                  {errors.cnic && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.cnic}</Text>}
                </View>

                 {role === 'Dhobi' && (
                    <>
                      <View style={{ marginBottom: 18 }}>
                        <View style={[styles.inputGroup, { marginBottom: 0 }, errors.landmark && { borderBottomColor: Colors.error }]}>
                          <Ionicons name="map-outline" size={20} color={errors.landmark ? Colors.error : Colors.textMuted} />
                          <TextInput style={styles.input} placeholder="Landmark (e.g Near Al-Fatah) *" value={landmark} onChangeText={(t) => {setLandmark(t); setErrors(prev=>({...prev, landmark: null}))}} />
                        </View>
                        {errors.landmark && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.landmark}</Text>}
                      </View>

                      <View style={{ marginBottom: 18 }}>
                        <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                          <Ionicons name="call-outline" size={20} color={Colors.textMuted} />
                          <TextInput style={styles.input} placeholder="Reference Numbers (Optional)" value={referenceNumbers} onChangeText={setReferenceNumbers} />
                        </View>
                      </View>

                      {dhobiType > 0 && (
                        <>
                          <View style={{ marginBottom: 18 }}>
                            <View style={[styles.inputGroup, { marginBottom: 0 }, errors.shop && { borderBottomColor: Colors.error }]}>
                              <Ionicons name="business-outline" size={20} color={errors.shop ? Colors.error : Colors.textMuted} />
                              <TextInput style={styles.input} placeholder="Shop Name *" value={shopName} onChangeText={(t) => {setShopName(t); setErrors(prev=>({...prev, shop: null}))}} />
                            </View>
                            {errors.shop && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.shop}</Text>}
                          </View>

                          <View style={{ marginBottom: 18 }}>
                            <View style={[styles.inputGroup, { marginBottom: 0 }, errors.ntn && { borderBottomColor: Colors.error }]}>
                              <Ionicons name="ribbon-outline" size={20} color={errors.ntn ? Colors.error : Colors.textMuted} />
                              <TextInput style={styles.input} placeholder="NTN Number *" value={ntn} onChangeText={(t) => {setNtn(t); setErrors(prev=>({...prev, ntn: null}))}} />
                            </View>
                            {errors.ntn && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.ntn}</Text>}
                          </View>
                        </>
                      )}
                    </>
                 )}

                 {role === 'Rider' && (
                    <>

                      <View style={{ marginBottom: 18 }}>
                        <View style={[styles.inputGroup, { marginBottom: 0 }, errors.vn && { borderBottomColor: Colors.error }]}>
                          <Ionicons name="bicycle-outline" size={20} color={errors.vn ? Colors.error : Colors.textMuted} />
                          <TextInput style={styles.input} placeholder="Vehicle Number (e.g. KGE-1234) *" value={vehicleNumber} onChangeText={(t) => {setVehicleNumber(t); setErrors(prev=>({...prev, vn: null}))}} />
                        </View>
                        {errors.vn && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.vn}</Text>}
                      </View>
                    </>
                 )}

                <View style={styles.uploadGrid}>
                   <UploadCard icon="id-card" label="CNIC Front" img={cnicImage} onPress={() => pickImage(setCnicImage)} error={errors.cnicImage} />
                   <UploadCard icon="camera" label="ID Selfie" img={selfieId} onPress={() => pickImage(setSelfieId)} error={errors.selfieId} />
                   <UploadCard icon="shield-checkmark" label="Police Letter" img={policeLetter} onPress={() => pickImage(setPoliceLetter)} error={errors.police} />
                </View>

                {role === 'Rider' && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Vehicle & Compliance</Text>
                    <View style={styles.uploadGrid}>
                      <UploadCard icon="card" label="License" img={drivingLicense} onPress={() => pickImage(setDrivingLicense)} error={errors.dl} />
                      <UploadCard icon="document" label="Registration" img={vehicleReg} onPress={() => pickImage(setVehicleReg)} error={errors.vr} />
                      <UploadCard icon="bicycle" label="Bike Photo" img={vehicleImg} onPress={() => pickImage(setVehicleImg)} error={errors.vi} />
                    </View>
                  </>
                )}

                {role === 'Dhobi' && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Utility & Capacity</Text>
                    <View style={styles.uploadGrid}>
                      <UploadCard icon="flash" label="Elec. Bill" img={billImg} onPress={() => pickImage(setBillImg)} error={errors.bill} />
                      <UploadCard icon="settings" label="Equipment" img={equipmentImg} onPress={() => pickImage(setEquipmentImg)} error={errors.equip} />
                      <UploadCard icon="ribbon" label="Shop Proof" img={licenseImage} onPress={() => pickImage(setLicenseImage)} error={errors.license} />
                    </View>
                  </>
                )}
              </View>
            )}

            <PrimaryButton 
              title={loading ? "Processing..." : `Register as ${role}`} 
              onPress={handleRegister} 
              loading={loading}
              style={{ marginTop: 20 }}
            />
          </View>
          
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Joined already? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={styles.loginLink}>Sign In</Text></TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showHelp && <UrduHelp />}
      
      <Modal visible={showDhobiSearch} animationType="slide" transparent={true}>
        <View style={styles.modalOverlaySearch}>
          <View style={styles.modalContentSearch}>
            <View style={styles.modalHeaderSearch}>
              <Text style={styles.modalTitleSearch}>Select Your Employer Shop</Text>
              <TouchableOpacity onPress={() => setShowDhobiSearch(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchBoxWrap}>
              <Ionicons name="search" size={20} color={Colors.textMuted} />
              <TextInput 
                style={styles.searchBoxInput} 
                placeholder="Type shop or dhobi name..." 
                value={dhobiSearchQuery}
                onChangeText={handleDhobiSearch}
                autoFocus
              />
              {searchingDhobi && <ActivityIndicator size="small" color={Colors.primary} />}
            </View>

            <ScrollView style={{ flex: 1 }}>
              {dhobiResults.map((item) => (
                <TouchableOpacity 
                  key={item.userId} 
                  style={styles.resultItemSearch}
                  onPress={() => {
                    setSelectedDhobi(item);
                    setShowDhobiSearch(false);
                    setErrors(prev => ({...prev, dhobiLink: null}));
                  }}
                >
                  <View style={styles.resultIconSearch}>
                    <Ionicons name="business" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.resultTitleSearch}>{item.shopName}</Text>
                      {item.dhobiType === 2 && (
                        <View style={{ backgroundColor: '#FCD34D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#92400E' }}>PREMIUM</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.resultSubSearch}>{item.fullName} • {item.address}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
              
              {dhobiSearchQuery.length > 2 && dhobiResults.length === 0 && !searchingDhobi && (
                <Text style={styles.emptyTextSearch}>No verified shops found.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 60, paddingBottom: 60 },
  header: { marginBottom: 30 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 20, elevation: 2 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  roleRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4, marginBottom: 24 },
  roleTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  roleTabActive: { backgroundColor: '#fff', elevation: 2 },
  roleTabText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  roleTabTextActive: { color: Colors.primary },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  profileSection: { alignItems: 'center', marginBottom: 24 },
  avatarPicker: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F8FAFC', borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, marginTop: 8 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: '#F1F5F9', marginBottom: 18, height: 50 },
  input: { flex: 1, marginLeft: 12, fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  verifySection: { marginTop: 10, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '900', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 0 },
  helpTrigger: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  helpTriggerText: { fontSize: 10, fontWeight: '800', color: Colors.primary },
  uploadGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, justifyContent: 'space-between' },
  uploadCard: { aspectRatio: 1.4, backgroundColor: '#fff', borderRadius: 14, borderStyle: 'dashed', borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', gap: 6 },
  uploadCardError: { borderColor: Colors.error, backgroundColor: Colors.error + '10' },
  uploadText: { fontSize: 9, fontWeight: '800', color: Colors.textMuted },
  previewImg: { width: '100%', height: '100%', borderRadius: 12 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  loginText: { fontSize: 14, color: Colors.textSecondary },
  loginLink: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  mapContainer: { height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  mapOverlayText: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', fontWeight: '600' },
  mapHint: { fontSize: 10, color: Colors.textMuted, marginTop: 8, fontStyle: 'italic' },
  helpOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, justifyContent: 'center', padding: 20 },
  helpModal: { backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden', maxHeight: '85%' },
  helpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  helpTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  helpScroll: { padding: 20 },
  helpItem: { flexDirection: 'row', marginBottom: 24, gap: 12 },
  helpNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  helpNumText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  helpItemTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  helpItemText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, textAlign: 'right' },
  closeHelpBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 10, marginBottom: 0 },
  closeHelpText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  // Search Modal Styles
  modalOverlaySearch: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContentSearch: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '80%', padding: 20 },
  modalHeaderSearch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitleSearch: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  searchBoxWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 16, height: 50, marginBottom: 20 },
  searchBoxInput: { flex: 1, marginLeft: 10, fontSize: 15, color: Colors.textPrimary, fontWeight: '600' },
  resultItemSearch: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 14 },
  resultIconSearch: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.primary + '15', alignItems: 'center', justifyContent: 'center' },
  resultTitleSearch: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  resultSubSearch: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  emptyTextSearch: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 14 },
});
