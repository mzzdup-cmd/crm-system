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

    } catch {

      setError(
        "Неверная почта или пароль"
      );

    }

  }

  return (

    <div className="min-h-screen bg-surface-deep flex items-center justify-center px-4">

      <form
        onSubmit={handleLogin}
        className="bg-surface border border-neutral-800 p-10 rounded-2xl w-full max-w-[400px]"
      >

        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
          CRM{" "}
          <span className="text-brand">School</span>
        </h1>

        <p className="text-neutral-400 mb-8 text-sm">
          Вход в систему
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="w-full p-4 rounded-xl mb-4 bg-surface-raised border border-neutral-800 text-white outline-none focus:border-brand/60"
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          className="w-full p-4 rounded-xl mb-4 bg-surface-raised border border-neutral-800 text-white outline-none focus:border-brand/60"
        />

        {

          error && (

            <div className="text-red-400 mb-4 text-sm">

              {error}

            </div>

          )

        }

        <button
          type="submit"
          className="w-full crm-btn-primary p-4 rounded-xl font-bold"
        >

          Войти

        </button>

      </form>

    </div>

  );

}
