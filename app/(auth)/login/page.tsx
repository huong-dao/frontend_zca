"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { HiEyeSlash, HiEye, HiOutlineEnvelope, HiOutlineLockClosed } from "react-icons/hi2";
import { useToast } from "@/components/features/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login, fetchMe } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (showPassword) {
      // show password
      document.getElementById("password")?.setAttribute("type", "text");
    } else {
      // hide password
      document.getElementById("password")?.setAttribute("type", "password");
    }
  }, [showPassword]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // validate form
    if (!email.trim()) {
      showToast("Vui lòng nhập email.", "error");
      return;
    }

    // validate email valid
    if (!email.includes("@")) {
      showToast("Email không hợp lệ.", "error");
      return;
    }

    if (!password.trim()) {
      showToast("Vui lòng nhập mật khẩu.", "error");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login({ email, password });
      await fetchMe();
      router.replace("/dashboard");
    } catch (submitError) {
      showToast("Đăng nhập thất bại. Vui lòng thử lại.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[440px] animate-in fade-in duration-700">
      <div className="mb-10 flex flex-col items-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container text-xl font-black text-white shadow-xl shadow-primary/20">
        ZCA
        </div>
        <h1 className="mb-2 text-center text-3xl font-black tracking-tight text-on-surface">
          Đăng nhập hệ thống
        </h1>
        <p className="body-md text-center text-on-surface-variant">
          Nhập thông tin đăng nhập để truy cập hệ thống
        </p>
      </div>

      <div className="rounded-xl bg-surface-container-lowest p-10 shadow-[0_8px_30px_rgba(25,28,30,0.06)] ring-1 ring-outline-variant/15">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              className="block text-[0.6875rem] font-semibold uppercase tracking-widest text-on-surface-variant"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                <HiOutlineEnvelope className="w-5 h-5" />
              </div>
              <input
                id="email"
                name="email"
                type="text"
                placeholder="name@company.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="pl-11 block w-full rounded-lg border-0 bg-surface-container-low px-4 py-3.5 text-on-surface transition-all placeholder:text-outline/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="block text-[0.6875rem] font-semibold uppercase tracking-widest text-on-surface-variant"
              htmlFor="password"
            >
              Mật khẩu
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-outline group-focus-within:text-primary transition-colors">
                <HiOutlineLockClosed className="w-5 h-5" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pl-11 pr-12 block w-full rounded-lg border-0 bg-surface-container-low px-4 py-3.5 text-on-surface transition-all placeholder:text-outline/60 focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-fixed"
              />
              <div className="absolute inset-y-0 right-0 flex z-50 items-center text-outline group-focus-within:text-primary transition-colors">
                <Button variant="icon_ghost" className={`text-slate-400 hover:text-slate-700 ${showPassword ? "text-slate-900" : "text-slate-400"}`} onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <HiEye /> : <HiEyeSlash />}
                </Button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          ) : null}

          <Button type="submit" fullWidth loading={submitting} disabled={loading || submitting}>
            Đăng nhập
          </Button>
        </form>
      </div>

      <p className="body-md mt-10 text-center text-on-surface-variant">
        Không có tài khoản?{" "}
        <span className="font-bold text-primary">Liên hệ Admin</span>
      </p>

      <div className="pointer-events-none fixed -left-20 top-20 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-[100px]" />
      <div className="pointer-events-none fixed -right-20 bottom-20 -z-10 h-96 w-96 rounded-full bg-secondary/5 blur-[100px]" />
    </div>
  );
}