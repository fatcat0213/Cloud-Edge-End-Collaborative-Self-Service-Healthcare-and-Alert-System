import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import MainLayout from '../components/MainLayout.vue'

// Lazy-loaded views
const Dashboard = () => import('../views/Dashboard.vue')
const TerminalsView = () => import('../views/TerminalsView.vue')
const AlertsView = () => import('../views/AlertsView.vue')
const DemoView = () => import('../views/DemoView.vue')
const RegistrationView = () => import('../views/RegistrationView.vue')
const QueueView = () => import('../views/QueueView.vue')
const InsuranceView = () => import('../views/InsuranceView.vue')
const PaymentView = () => import('../views/PaymentView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: LoginView,
      meta: { public: true }
    },
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', component: Dashboard },
        { path: 'terminals', component: TerminalsView },
        { path: 'alerts', component: AlertsView },
        { path: 'demo', component: DemoView },
        { path: 'registration', component: RegistrationView },
        { path: 'queue', component: QueueView },
        { path: 'insurance', component: InsuranceView },
        { path: 'payment', component: PaymentView },
        { path: ':pathMatch(.*)*', redirect: '/dashboard' }
      ]
    }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('auth_token')
  if (!to.meta.public && !token) return '/login'
  if (to.path === '/login' && token) return '/dashboard'
})

export default router
