import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../components/MainLayout.vue'
import Dashboard from '../views/Dashboard.vue'
import TerminalsView from '../views/TerminalsView.vue'
import AlertsView from '../views/AlertsView.vue'
import RegistrationView from '../views/RegistrationView.vue'
import QueueView from '../views/QueueView.vue'
import PaymentView from '../views/PaymentView.vue'
import InsuranceView from '../views/InsuranceView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', component: Dashboard },
        { path: 'terminals', component: TerminalsView },
        { path: 'alerts', component: AlertsView },
        { path: 'registration', component: RegistrationView },
        { path: 'queue', component: QueueView },
        { path: 'payment', component: PaymentView },
        { path: 'insurance', component: InsuranceView },
      ]
    }
  ]
})
