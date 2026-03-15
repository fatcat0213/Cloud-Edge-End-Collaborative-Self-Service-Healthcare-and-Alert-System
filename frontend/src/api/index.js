import axios from 'axios'

const http = axios.create({ baseURL: '/api/v1', timeout: 10000 })

export const login = (credentials) => http.post('/auth/login', credentials)
export const getAlerts = () => http.get('/alerts')
export const getQueue = (deptCode) => http.get(`/queue/${deptCode}`)
export const register = (data) => http.post('/registration', data)
export const verifyInsurance = (data) => http.post('/insurance/verify', data)
export const verifyPayment = (data) => http.post('/payment/verify', data)
export const getReport = (patientId) => http.get(`/report/${patientId}`)
