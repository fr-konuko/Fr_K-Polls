// Firebase configuration is loaded from the local runtime config instead of
// being embedded in source control.
const firebaseConfig = (window.__APP_CONFIG__ && window.__APP_CONFIG__.firebase) || {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};
