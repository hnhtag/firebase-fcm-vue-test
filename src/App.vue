<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />

    <br />
    <button @click="subscribeToken" v-if="!clientToken">Subscribe</button>
    <button @click="unsubscribeToken" v-else>Unsubscribe</button>
    <br />
    <br />

    <div v-if="clientToken">
      Token: <br />
      {{ clientToken }}
    </div>

    <notifications group="test" />
  </div>
</template>

<script>
import { app as firebaseApp } from "./firebase";
import {
  getToken,
  getMessaging,
  onMessage,
  deleteToken,
} from "firebase/messaging";

export default {
  name: "App",
  data: () => ({
    messaging: null,
    clientToken: null,
  }),
  created() {
    this.messaging = getMessaging(firebaseApp);
    if (this.isAlreadySubscribed()) {
      this.clientToken = this.getSubscribedToken();
      this.listenMessage();
    }
  },
  mounted() {},
  methods: {
    async subscribeToken() {
      let vapidKey = process.env.VAPIDKEY;
      try {
        let token = await getToken(this.messaging, { vapidKey });
        console.log("Client token => ", token);

        this.setSubscribedToken(token);
        this.listenMessage();
      } catch (err) {
        console.error(err);
      }
    },
    listenMessage() {
      onMessage(this.messaging, (payload) => {
        console.log("Message received. ", payload);
        let { notification: notificationData } = payload;
        if (notificationData) {
          const notificationTitle = notificationData.title || "Test title";
          const notificationBody = notificationData.body || "Test body";

          this.$notify({
            group: "test",
            title: "[Foreground] " + notificationTitle,
            text: notificationBody,
            duration: 10000,
          });
        }
      });
    },
    async unsubscribeToken() {
      try {
        let unsubscribe = await deleteToken(this.messaging);
        console.log(unsubscribe);
        this.unsetSubscribedToken();
      } catch (err) {
        console.error(err);
      }
    },
    getSubscribedToken() {
      return localStorage.getItem("clientToken");
    },
    isAlreadySubscribed() {
      return !!localStorage.getItem("clientToken");
    },
    setSubscribedToken(clientToken) {
      this.clientToken = clientToken;
      localStorage.setItem("clientToken", clientToken);
    },
    unsetSubscribedToken() {
      this.clientToken = null;
      localStorage.removeItem("clientToken");
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
  min-height: 100vh;
}
</style>
