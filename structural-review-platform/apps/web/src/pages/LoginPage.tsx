import { FormEvent, useState } from "react";
import { login, type AuthUser } from "../api/client";

type LoginPageProps = {
  onLoggedIn: (user: AuthUser) => void;
};

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSubmitting(true);
    try {
      const { user } = await login(username.trim(), password);
      onLoggedIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={(e) => void handleSubmit(e)}>
        <p className="eyebrow">结构项目评审平台</p>
        <h1>登录</h1>
        <p className="login-hint">请输入账号和密码以访问资料库。</p>

        <label className="login-field">
          <span>用户名</span>
          <input
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
            required
            type="text"
            value={username}
          />
        </label>

        <label className="login-field">
          <span>密码</span>
          <input
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {error ? <p className="error-text">{error}</p> : null}

        <button className="primary-upload login-submit" disabled={submitting} type="submit">
          {submitting ? "登录中..." : "登录"}
        </button>
      </form>
    </main>
  );
}
