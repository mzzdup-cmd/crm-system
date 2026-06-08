import "./firebase";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

const auth = getAuth();

export const login = async (
  email,
  password
) => {

  return await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

};

export const logout = async () => {

  return await signOut(auth);

};