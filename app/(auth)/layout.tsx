import { ToastProvider } from "@/components/features/Toast";
export const metadata = {
  title: "Đăng nhập | ZCA Admin System",
  description: "Hệ thống quản lý nội bộ",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
        <ToastProvider>
            {children}
        </ToastProvider>
    </main>
  );
}