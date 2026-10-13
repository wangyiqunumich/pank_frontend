import Vue from 'vue';
import App from './App.vue';
Vue.directive('b-tooltip', {});
Vue.config.productionTip = false;
new Vue({ render: h => h(App) }).$mount('#app');
