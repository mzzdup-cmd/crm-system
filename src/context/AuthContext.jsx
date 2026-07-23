import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "../services/firebase";

import {
  getUserData,
  ensureUserProfile,
} from "../services/userService";

const AuthContext =
  createContext();

export function AuthProvider({
  children,
}) {

  const [user, setUser] =
    useState(null);

  const [userData, setUserData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(

        auth,

        async (currentUser) => {

          setUser(currentUser);

          try {
            if (currentUser) {
              let data =
                await getUserData(
                  currentUser.uid
                );

              if (!data) {
                data =
                  await ensureUserProfile(
                    currentUser
                  );
              }

              setUserData(data);
            } else {
              setUserData(null);
            }
          } catch (error) {
            console.error(
              "Failed to load user profile:",
              error
            );
            setUserData(null);
          } finally {
            setLoading(false);
          }

        }

      );

    return () => unsubscribe();

  }, []);

  return (

    <AuthContext.Provider

      value={{
        user,
        userData,
        loading,
      }}

    >

      {children}

    </AuthContext.Provider>

  );

}

export function useAuth() {

  return useContext(AuthContext);

}
