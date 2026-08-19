import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCdQNDec0hawVD0apXwMopuJvpwFxIxGI8",
  authDomain: "conpany-1dffc.firebaseapp.com",
  databaseURL: "https://conpany-1dffc-default-rtdb.firebaseio.com",
  projectId: "conpany-1dffc",
  storageBucket: "conpany-1dffc.firebasestorage.app",
  messagingSenderId: "639540371906",
  appId: "1:639540371906:web:4a744ec0fb88052cf2f65b",
  measurementId: "G-4Q27EG1ZJM"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
