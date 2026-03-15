import axios from 'axios'

const http = axios.create({ baseURL: '/api/v1', timeout: 10000 })

// Request interceptor: attach Authorization header if token exists
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Response interceptor: on 401, clear token and redirect to login
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Existing endpoints
export const getAlerts = () => http.get('/alerts')
export const getQueue = (deptCode) => http.get(`/queue/${deptCode}`)
export const register = (data) => http.post('/registration', data)
export const verifyInsurance = (data) => http.post('/insurance/verify', data)
export const verifyPayment = (data) => http.post('/payment/verify', data)
export const getReport = (patientId) => http.get(`/report/${patientId}`)

// New endpoints
export const login = (data) => http.post('/auth/login', data)
export const getPaymentStats = () => http.get('/payment/stats')
export const startSimulator = () => http.post('/simulator/start')
export const stopSimulator = () => http.post('/simulator/stop')
export const injectScene = (data) => http.post('/simulator/inject', data)
