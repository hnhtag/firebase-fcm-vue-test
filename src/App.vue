<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />

    {{ statusMessage }}
    <br />
    <button @click="unsubscribeToken" v-if="clientToken && clientToken.uuid">
      Unsubscribe
    </button>
    <button v-else @click="registerServiceWorker">Subscribe</button>
    <br />
    <br />

    <div v-if="clientToken && clientToken.uuid">
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
import axios from "axios";
import { register as registerSW } from "register-service-worker";

export default {
  name: "App",
  data: () => ({
    messaging: null,
    clientToken: null,
    statusMessage: null,
  }),
  async created() {
    this.messaging = getMessaging(firebaseApp);
    if (this.isSubscribed()) this.clientToken = await this.getSubscribedToken();
    await this.registerServiceWorker();
  },
  mounted() {},
  methods: {
    async registerServiceWorker() {
      let subscribeToken = this.subscribeToken;
      if ("Notification" in window && navigator.serviceWorker) {
        registerSW(`${process.env.BASE_URL}firebase-messaging-sw.js`, {
          ready(reg) {
            console.log("Service worker is Ready");
            // subsctibe to FCM
            subscribeToken(reg);
          },
          registered(reg) {
            console.log("Service worker has been registered.");
            setInterval(() => {
              reg.update();
            }, 1000 * 60 * 30); // 30 min checks
          },
          cached() {
            // console.log('Content has been cached for offline use.');
          },
          updatefound() {
            console.log("New content is downloading.");
          },
          updated(reg) {
            console.log("New content is available; please refresh.");
            document.dispatchEvent(
              new CustomEvent("swUpdated", { detail: reg.waiting })
            );
          },
          offline() {
            console.log("No internet connection found.");
          },
          error(error) {
            console.error("Error during service worker registration:", error);
          },
        });
      }
    },
    async subscribeToken(reg) {
      let vapidKey = process.env.VAPIDKEY;
      try {
        let token = await getToken(this.messaging, {
          vapidKey,
          serviceWorkerRegistration: reg,
        });

        console.log("Client token => ", token);

        // send token to server
        let res = await this.sendTokenToServer(token);
        console.log("Sent to server", res.data);

        // store returned uuid with token
        this.setSubscribedToken(res.data);

        this.listenForegroundMessage(reg);
      } catch (err) {
        console.error(err);
        this.unsetSubscribedToken();
        console.log("Retry to subscribe");
      }
    },
    async unsubscribeToken() {
      try {
        let unsubscribe = await deleteToken(this.messaging);
        console.log("Subscribed  ", unsubscribe);
        let res = await this.removeTokenFromServer(this.clientToken.uuid);
        console.log("Unsubscribed from server", res.data);
        await this.unsetSubscribedToken();
      } catch (err) {
        console.error(err);
      }
    },
    async listenForegroundMessage(reg) {
      if (!reg)
        reg = await navigator.serviceWorker.getRegistration(
          `${process.env.BASE_URL}firebase-messaging-sw.js`
        );

      onMessage(this.messaging, (payload) => {
        console.log("Message received. ", payload);
        let { notification, data } = payload;
        let notificationTitle = "Test title";
        let notificationBody = "Test body";

        if (notification && notification.title && notification.body) {
          notificationTitle = notification.title;
          notificationBody = notification.body;
        } else if (data && data.title && data.body) {
          notificationTitle = data.title;
          notificationBody = data.body;
        }

        // in window noti
        this.$notify({
          group: "test",
          title: "[Foreground] " + notificationTitle,
          text: notificationBody,
          duration: 10000,
        });

        const notificationOptions = {
          body: notificationBody,
        };
        if (reg)
          reg.showNotification(
            "[Foreground] " + notificationTitle,
            notificationOptions
          );
      });
    },
    isSubscribed() {
      let ct = localStorage.getItem("clientToken");
      console.log("Subscribed", !!ct);
      return !!ct;
    },
    setSubscribedToken({ data }) {
      this.clientToken = data;
      console.log("stored in localstorage", this.clientToken);
      localStorage.setItem("clientToken", JSON.stringify(this.clientToken));
    },
    unsetSubscribedToken() {
      this.clientToken = null;
      localStorage.removeItem("clientToken");
      console.log("removed from localstorage", this.clientToken);
    },
    async getSubscribedToken() {
      let ct = localStorage.getItem("clientToken");

      if (ct) return JSON.parse(ct);
      else return null;
    },
    sendTokenToServer(token) {
      let dataObj = { token };
      if (this.clientToken && this.clientToken.uuid) {
        dataObj = { uuid: this.clientToken.uuid, token };
        console.log("before send to server", dataObj);
      }

      return axios.post("http://localhost:3000/api/fcm/token/save", dataObj);
    },
    removeTokenFromServer(uuid) {
      return axios.delete("http://localhost:3000/api/fcm/token/delete/" + uuid);
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
