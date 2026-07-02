import { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Image, ActivityIndicator, Alert, RefreshControl 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme/typography';
import { userService, getImageUrl } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

export default function ManageStaffScreen({ navigation, route }) {
  const batchIds = route.params?.batchIds || null;
  const [activeTab, setActiveTab] = useState(batchIds ? 'staff' : 'requests');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      if (activeTab === 'requests') {
        const res = await userService.getRiderLinkRequests();
        setData(res.data);
      } else {
        const res = await userService.getLinkedStaff();
        setData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleAction = async (riderId, approve) => {
    try {
      await userService.confirmRiderLink(riderId, approve);
      Alert.alert(
        approve ? 'Rider Linked' : 'Request Rejected',
        approve ? 'This rider is now part of your official staff.' : 'The link request has been removed.'
      );
      fetchData();
    } catch (e) {
      Alert.alert('Error', 'Action failed. Please try again.');
    }
  };

  const handleAssignBatch = async (riderId) => {
    try {
      setLoading(true);
      await orderService.batchAssignRider(batchIds, riderId);
      Alert.alert('Success', `Batch of ${batchIds.length} orders assigned to rider.`);
      navigation.navigate('MyOrders');
    } catch (e) {
      Alert.alert('Error', 'Failed to assign batch.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image 
          source={{ uri: getImageUrl(item.profilePictureUrl) }} 
          style={styles.avatar} 
        />
        <View style={styles.info}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.role}>{item.role}</Text>
          <Text style={styles.phone}>{item.phoneNumber}</Text>
        </View>
        {activeTab === 'requests' ? (
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>PENDING</Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[styles.statusText, { color: '#166534' }]}>STAFF</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {activeTab === 'requests' ? (
          <>
            <TouchableOpacity 
              style={[styles.btn, styles.rejectBtn]} 
              onPress={() => handleAction(item.userId, false)}
            >
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.approveBtn]} 
              onPress={() => handleAction(item.userId, true)}
            >
              <Text style={styles.approveText}>Confirm Link</Text>
            </TouchableOpacity>
          </>
        ) : (
          batchIds ? (
            <TouchableOpacity 
              style={[styles.btn, styles.approveBtn, { flexDirection: 'row' }]} 
              onPress={() => handleAssignBatch(item.id || item.userId)}
            >
              <Ionicons name="flash" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.approveText}>Assign Batch to Him</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.btn, styles.rejectBtn]} 
              onPress={() => Alert.alert('Staff Member', `${item.fullName} is an active member of your logistics team.`)}
            >
              <Text style={styles.rejectText}>View Profile</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Staff</Text>
        </View>
        <Text style={styles.subtitle}>
          {batchIds ? `Choose a rider for ${batchIds.length} orders` : 'Manage riders who work for your shop'}
        </Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>Link Requests</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'staff' && styles.activeTab]}
            onPress={() => setActiveTab('staff')}
          >
            <Text style={[styles.tabText, activeTab === 'staff' && styles.activeTabText]}>My Staff</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => (item.id || item.userId).toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>{activeTab === 'requests' ? 'No pending requests' : 'No staff members yet'}</Text>
              <Text style={styles.emptySub}>
                {activeTab === 'requests' 
                  ? 'Riders can search for your shop and send requests during signup.' 
                  : 'Approved riders will appear here for order assignment.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 8, marginLeft: 56 },
  list: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F1F5F9' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  role: { fontSize: 12, color: Colors.primary, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },
  phone: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  statusBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  btn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { backgroundColor: '#F1F5F9' },
  approveBtn: { backgroundColor: Colors.primary },
  rejectText: { color: Colors.textSecondary, fontWeight: '700' },
  approveText: { color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginTop: 16 },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 14, marginTop: 20, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#fff', elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  activeTabText: { color: Colors.primary, fontWeight: '800' },
});
