import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Customer Screens
import CustomerDashboard from '../screens/customer/CustomerDashboard';
import CreateOrderScreen from '../screens/customer/CreateOrderScreen';
import ViewBidsScreen from '../screens/customer/ViewBidsScreen';
import TrackOrderScreen from '../screens/customer/TrackOrderScreen';

// Dhobi Screens
import DhobiDashboard from '../screens/dhobi/DhobiDashboard';
import PlaceBidScreen from '../screens/dhobi/PlaceBidScreen';
import ManageServicesScreen from '../screens/dhobi/ManageServicesScreen';
import DhobiUpgradeScreen from '../screens/dhobi/DhobiUpgradeScreen';
import ManageStaffScreen from '../screens/dhobi/ManageStaffScreen';

// Rider Screens
import RiderDashboard from '../screens/rider/RiderDashboard';
import UpdateStatusScreen from '../screens/rider/UpdateStatusScreen';

// Shared & New Screens
import PaymentScreen from '../screens/customer/PaymentScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';
import WalletScreen from '../screens/shared/WalletScreen';
import MyOrdersScreen from '../screens/dhobi/MyOrdersScreen';
import HistoryScreen from '../screens/shared/HistoryScreen';
import AddressBookScreen from '../screens/shared/AddressBookScreen';
import MarketplaceScreen from '../screens/dhobi/MarketplaceScreen';
import ChatListScreen from '../screens/shared/ChatListScreen';
import ChatRoomScreen from '../screens/shared/ChatRoomScreen';
import LocationPickerScreen from '../screens/shared/LocationPickerScreen';
import EditProfileScreen from '../screens/shared/EditProfileScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import HelpSupportScreen from '../screens/shared/HelpSupportScreen';
import TermsConditionsScreen from '../screens/shared/TermsConditionsScreen';
import PrivacySettingsScreen from '../screens/shared/PrivacySettingsScreen';
import PaymentMethodsScreen from '../screens/shared/PaymentMethodsScreen';
import AddPaymentMethodScreen from '../screens/customer/AddPaymentMethodScreen';
import MockPaymentGatewayScreen from '../screens/shared/MockPaymentGatewayScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// --- Role-Based Bottom Tabs ---

function CustomerTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#FFFFFF', 
          borderTopWidth: 0, 
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom + 10,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.04,
          shadowRadius: 15,
          elevation: 20,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          let iconName =
            route.name === 'Home' ? 'home' :
            route.name === 'History' ? 'receipt' :
            route.name === 'Messages' ? 'chatbubble-ellipses' :
            route.name === 'Profile' ? 'person' : 'list';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={CustomerDashboard} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} initialParams={{ role: 'Customer' }} />
    </Tab.Navigator>
  );
}

function DhobiTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#FFFFFF', 
          borderTopWidth: 0, 
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom + 10,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.04,
          shadowRadius: 15,
          elevation: 20,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          let iconName =
            route.name === 'Home' ? 'stats-chart' :
            route.name === 'Market' ? 'basket' :
            route.name === 'Messages' ? 'chatbubble-ellipses' :
            route.name === 'History' ? 'receipt' : 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={DhobiDashboard} />
      <Tab.Screen name="Market" component={MarketplaceScreen} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} initialParams={{ role: 'Dhobi' }} />
    </Tab.Navigator>
  );
}

function RiderTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#FFFFFF', 
          borderTopWidth: 0, 
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom + 10,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.04,
          shadowRadius: 15,
          elevation: 20,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Tasks') iconName = 'bicycle';
          else if (route.name === 'Messages') iconName = 'chatbubble-ellipses';
          else if (route.name === 'History') iconName = 'receipt';
          else if (route.name === 'Wallet') iconName = 'wallet';
          else if (route.name === 'Profile') iconName = 'person';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Tasks" component={RiderDashboard} />
      <Tab.Screen name="Messages" component={ChatListScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} initialParams={{ role: 'Rider' }} />
    </Tab.Navigator>
  );
}

// --- Main Stack ---

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      
      {/* Role Groups */}
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
      <Stack.Screen name="DhobiTabs" component={DhobiTabs} />
      <Stack.Screen name="RiderTabs" component={RiderTabs} />

      {/* Shared/Modal Screens */}
      <Stack.Screen name="CreateOrder" component={CreateOrderScreen} />
      <Stack.Screen name="ViewBids" component={ViewBidsScreen} />
      <Stack.Screen name="TrackOrder" component={TrackOrderScreen} />
      <Stack.Screen name="PlaceBid" component={PlaceBidScreen} />
      <Stack.Screen name="ManageServices" component={ManageServicesScreen} />
      <Stack.Screen name="DhobiUpgrade" component={DhobiUpgradeScreen} />
      <Stack.Screen name="ManageStaff" component={ManageStaffScreen} />
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
      <Stack.Screen name="UpdateStatus" component={UpdateStatusScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="AddressBook" component={AddressBookScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="HistoryShared" component={HistoryScreen} />
      <Stack.Screen name="ProfileShared" component={ProfileScreen} />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
      <Stack.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} />
      <Stack.Screen name="MockPaymentGateway" component={MockPaymentGatewayScreen} />
    </Stack.Navigator>
  );
}
