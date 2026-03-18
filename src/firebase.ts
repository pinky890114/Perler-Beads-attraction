import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnQwdNdnTYw8Lz3gLr-YPp8VLxJvxuxc8",
  authDomain: "perler-beads-85b21.firebaseapp.com",
  projectId: "perler-beads-85b21",
  storageBucket: "perler-beads-85b21.firebasestorage.app",
  messagingSenderId: "867527247711",
  appId: "1:867527247711:web:5a5e81272ea0c09b7ad8ea",
  measurementId: "G-L524CVWDH3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
