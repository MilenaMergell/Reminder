import { createRouter, createWebHistory } from '@ionic/vue-router';
import HomePage from '../views/HomePage.vue';
import ReminderFormPage from '../views/ReminderFormPage.vue';

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/reminder/add',
    name: 'AddReminder',
    component: ReminderFormPage
  },
  {
    path: '/reminder/edit/:id',
    name: 'EditReminder',
    component: ReminderFormPage
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

export default router;
