// lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyD-mUSc-aAJ7vC8aT-cWRq6j_C8JIOynqs",
    authDomain: "tldz-4e20f.firebaseapp.com",
    projectId: "tldz-4e20f",
    //storageBucket: "tldz-4e20f.firebasestorage.app",
    storageBucket: "tldz-4e20f.appspot.com", // ✅ FIXED this line
    messagingSenderId: "158863095252",
    appId: "1:158863095252:web:cf021973d30dd57c9b1241",
    measurementId: "G-1J8757EB0P"
  };

  const app = initializeApp(firebaseConfig);

  const db = getFirestore(app);
  const auth = getAuth(app);
  const storage = getStorage(app); // ✅ Add this
  
  export { app, db, auth, storage }; // ✅ Add `app` here