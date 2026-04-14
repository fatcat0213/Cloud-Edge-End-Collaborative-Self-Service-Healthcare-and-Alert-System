import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import MainLayout from '../components/MainLayout.vue'

// Lazy-loaded views
const Dashboard = () => import('../views/Dashboard.vue')
const TerminalsView = () => import('../views/TerminalsView.vue')
const AlertsView = () => import('../views/AlertsView.vue')
const TerminalSideView = () => import('../views/TerminalSideView.vue')
const EdgeSideView = () => import('../views/EdgeSideView.vue')
const CloudSideView = () => import('../views/CloudSideView.vue')
const CloudOpsView = () => import('../views/CloudOpsView.vue')

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
        { path: 'terminal-side', component: TerminalSideView },
        { path: 'edge-side', component: EdgeSideView },
        { path: 'cloud-side', component: CloudSideView },
        { path: 'cloud-ops', component: CloudOpsView },
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
