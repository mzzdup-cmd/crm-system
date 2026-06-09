import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getAuth,
  onAuthStateChanged,
} from "firebase/auth";

import { getUserData }
from "../services/userService";

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

    const auth = getAuth();

    const unsubscribe =
      onAuthStateChanged(

        auth,

        async (currentUser) => {

          setUser(currentUser);

          if (currentUser) {

            const data =
              await getUserData(
                currentUser.uid
              );

            setUserData(data);

          } else {

            setUserData(null);

          }

          setLoading(false);

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
