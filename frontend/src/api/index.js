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
export const getQueue = (deptCode) => http.get(`/queue/${deptCode}`)
export const register = (data) => http.post('/registration', data)

export const getRegistrations = () => http.get('/registration')
export const getRegistrationDepartments = () => http.get('/registration/departments')
export const getRegistrationDoctors = (deptCode) => http.get('/registration/doctors', { params: { deptCode } })
export const verifyInsurance = (data) => http.post('/insurance/verify', data)
export const verifyPayment = (data) => http.post('/payment/verify', data)
export const pay = (data) => http.post('/payment', data)

export const getPaymentStats = () => http.get('/payment/stats')
export const getPayments = () => http.get('/payment')
export const getReport = (patientId) => http.get(`/report/${patientId}`)

// New endpoints
// Mock login - for demo purposes without backend
export const login = (data) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (data.username === 'admin' && data.password === 'admin123') {
        resolve({ data: { token: 'mock-token-12345', username: 'admin' } })
      } else {
        resolve({ data: { message: 'Invalid credentials' } })
      }
    }, 300)
  })
}
export const startSimulator = () => http.post('/simulator/start')

export const stopSimulator = () => http.post('/simulator/stop')

export const injectScene = (data) => http.post('/simulator/inject', data)

export const getSimulatorStatus = () => http.get('/simulator/status')

export const getSimulatorAlerts = () => http.get('/simulator/alerts')

export const getSimulatorTerminals = () => http.get('/simulator/terminals')

export const getSimulatorMetrics = () => http.get('/simulator/metrics')

export const recoverSimulatorTerminal = (terminalId) => http.post(`/simulator/recover/${terminalId}`)

export const resetSimulator = () => http.post('/simulator/reset')

export const getQueueByDept = (deptCode) => http.get(`/queue/${deptCode}`)

export const submitRegistration = (data) => http.post('/registration', data)

export const runInsuranceVerify = (data) => http.post('/insurance/verify', data)

export const runPayment = (data) => http.post('/payment', data)

export const getPaymentRecords = () => http.get('/payment')

export const getRegistrationRecords = () => http.get('/registration')

export const getPaymentStatistics = () => http.get('/payment/stats')

// Edge alerts from Redis (real backend data)
export const getEdgeAlerts = (params = {}) => http.get('/alerts', { params })

export const acknowledgeAlert = (alertId) => http.post(`/alerts/${alertId}/acknowledge`)

export const resolveAlert = (alertId) => http.post(`/alerts/${alertId}/resolve`)

// OpsLog from Redis (backend-persisted)
export const getOpsLogs = (params = {}) => http.get('/opslog', { params })

export { edgeCommandApi } from './edgeCommand'
