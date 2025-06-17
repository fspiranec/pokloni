import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUPVkkWT_Ecls2dj-xUUYrZPjBzEtC-_8",
  authDomain: "franjo-wishlist.firebaseapp.com",
  projectId: "franjo-wishlist",
  storageBucket: "franjo-wishlist.firebasestorage.app",
  messagingSenderId: "1067767310906",
  appId: "1:1067767310906:web:2b0669c039e08a9e97a303"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
