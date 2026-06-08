import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRDxt_fsOZFQelbG9dEJkWkuNK_mfUoHo",
  authDomain: "crm-school-v2.firebaseapp.com",
  projectId: "crm-school-v2",
  storageBucket: "crm-school-v2.firebasestorage.app",
  messagingSenderId: "571495900614",
  appId: "1:571495900614:web:0d7c65d6c80508118f3ec7",
  measurementId: "G-XQHR93EDMF"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export default app;