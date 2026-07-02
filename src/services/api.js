import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- THE ONLY PLACE YOU EVER CHANGE THE IP ---
// Replace with your current machine IP (ipconfig)
export const BASE_IP = 'dhoobigo-dotnet-backend.onrender.com'; // For Emulator
export const BASE_PORT = '5286';

// For Physical Device: http://192.168.18.xx:5286/api
// For Emulator: http://10.0.2.2:5286/api
export const BASE_URL = `https://${BASE_IP}/api`; 
export const SOCKET_URL = `https://${BASE_IP}`;

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `http://${BASE_IP}:${BASE_PORT}${path}`;
};

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Auth Token
api.interceptors.request.use(
  async (config) => {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (e) {
      console.warn('[STORAGE WARN] Could not access token:', e.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for Logging & Error Handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API SUCCESS] ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('[API ERROR] Detailed Breakdown:');
    if (error.response) {
      console.error(`- Status: ${error.response.status}`);
      console.error(`- Data: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('- No Response Received. Possible Timeout or Firewall Block.');
      console.error(`- Request URL: ${error.config.url}`);
    } else {
      console.error(`- Setup Error: ${error.message}`);
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
  },
};

// Order Services
export const orderService = {
  create: (data) => api.post('/orders', data),
  getPending: () => api.get('/orders/pending'),
  getMyOrders: () => api.get('/orders/my'),
  getRiderOrders: (riderId) => api.get(`/orders/rider/${riderId}`),
  acceptTask: (orderId, riderId) => api.post('/orders/accept-task', { orderId, riderId }),
  bidOnTask: (orderId, riderId, fee) => api.post('/orders/bid-delivery', { orderId, riderId, fee }),
  updateStatus: (orderId, data) => api.put(`/orders/${orderId}/status`, data),
  getDhobiOrders: (dhobiId) => api.get(`/orders/dhobi/${dhobiId}`),
  getBids: (orderId) => api.get(`/bids/order/${orderId}`),
  placeBid: (bidData) => api.post('/orders/bid', bidData),
  selectBid: (orderId, bidId) => api.post(`/orders/${orderId}/select-bid/${bidId}`),
  getByID: (id) => api.get(`/orders/${id}`),
  getById: (id) => api.get(`/orders/${id}`),
  
  // Marketplace Logic
  getAvailableTasks: () => api.get('/orders/available-tasks'),
  getRiderMarketplace: () => api.get('/orders/available-tasks'),
  getMyRiderOrders: () => api.get('/orders/my'),
  getRiderStats: () => api.get('/payments/wallet'),
  claimRiderTask: (data) => api.post('/orders/bid-delivery', data),
  
  acceptTask: (orderId, riderId) => api.post(`/orders/${orderId}/accept-task/${riderId}`),
  acceptRiderBid: (orderId, bidId) => api.post(`/orders/${orderId}/accept-delivery-bid/${bidId}`),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
  raiseDispute: (id, reason) => api.post(`/orders/${id}/dispute`, { reason }),
  uploadImage: (formData) => api.post('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  batchAssignRider: (orderIds, riderId) => api.post('/orders/batch-assign', { orderIds, riderId }),
};

// User Services
export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getPreferences: () => api.get('/settings/privacy'),
  updatePreferences: (prefs) => api.post('/settings/privacy', prefs),
  getMyServices: () => api.get('/users/services'),
  addService: (data) => api.post('/users/services', data),
  updateService: (id, data) => api.put(`/users/services/${id}`, data),
  deleteService: (id) => api.delete(`/users/services/${id}`),
  getServiceCatalog: () => api.get('/users/catalog'),
  updateLocation: (data) => api.post('/users/update-location', data),
  getPartnerProfile: (id) => api.get(`/users/${id}/profile`),
  
  // Tier Upgrade
  requestUpgrade: (data) => api.post('/users/request-upgrade', data),
  getPendingUpgrades: () => api.get('/users/pending-upgrades'),
  approveUpgrade: (id, approve) => api.post(`/users/${id}/approve-upgrade?approve=${approve}`),

  // Handshake (Logistics Linking)
  searchDhobis: (q) => api.get(`/users/dhobis/search?q=${q}`),
  requestRiderLink: (data) => api.post('/users/request-rider-link', data),
  getRiderLinkRequests: () => api.get('/users/rider-link-requests'),
  confirmRiderLink: (riderId, approve) => api.post(`/users/confirm-rider-link/${riderId}?approve=${approve}`),
  getLinkedStaff: () => api.get('/users/linked-staff'),
};

export const paymentService = {
  getWalletBalance: () => api.get('/payments/balance'),
  getSavedCards: () => api.get('/payments/methods'),
  addPaymentMethod: (data) => api.post('/payments/methods', data),
  processPayment: (data) => api.post('/payments', data),
  topUp: (amount) => api.post('/payments/topup', { amount }),
  withdraw: (data) => api.post('/payments/withdraw', data),
  getWalletOverview: () => api.get('/payments/wallet'),
};

// Address Services
export const addressService = {
  getAll: () => api.get('/addresses'),
  add: (data) => api.post('/addresses', data),
  delete: (id) => api.delete(`/addresses/${id}`),
};

// Notification Services
export const notificationService = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.post(`/notifications/${id}/read`),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Chat Services
export const chatService = {
  getHistory: (groupName) => api.get(`/Chat/history/${groupName}`),
  getConversations: (userId) => api.get(`/Chat/conversations/${userId}`),
};

// Review Services
export const reviewService = {
  postReview: (data) => api.post('/Review', data),
  getDhobiReviews: (dhobiId) => api.get(`/Review/dhobi/${dhobiId}`),
};

export default api;
