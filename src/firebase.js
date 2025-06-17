import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB5E4JnA6KbmannBS210Vn0fgvkhommfXY",
  authDomain: "franjopokloni.firebaseapp.com",
  projectId: "franjopokloni",
  storageBucket: "franjopokloni.firebasestorage.app",
  messagingSenderId: "582726782768",
  appId: "1:582726782768:web:38287879cf213b32d042f5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
