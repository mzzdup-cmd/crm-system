import { useState } from "react";

import {
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function LoginForm() {

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  async function handleLogin(e) {

    e.preventDefault();

    try {

      const auth = getAuth();

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    } catch (err) {

      setError(
        "Неверная почта или пароль"
      );

    }

  }

  return (

    <div className="min-h-screen bg-slate-950 flex items-center justify-center">

      <form
        onSubmit={handleLogin}
        className="bg-slate-900 p-10 rounded-2xl w-[400px]"
      >

        <h1 className="text-4xl font-bold text-white mb-8">

          Вход в CRM

        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="w-full p-4 rounded-xl mb-4 bg-slate-800 text-white"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          className="w-full p-4 rounded-xl mb-4 bg-slate-800 text-white"
        />

        {

          error && (

            <div className="text-red-400 mb-4">

              {error}

            </div>

          )

        }

        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl font-bold"
        >

          Войти

        </button>

      </form>

    </div>

  );

}