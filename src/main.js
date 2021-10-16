import Vue from 'vue'
import App from './App.vue'
import Notifications from 'vue-notification'

Vue.config.productionTip = false

Vue.use(Notifications)

new Vue({
  render: h => h(App),
}).$mount('#app')
