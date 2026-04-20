/**
 * Gợi ý PM2: Next.js giữ pending QR + session Zalo trong RAM từng process.
 * Chạy nhiều instance (cluster) có thể khiến poll GET /api/zalo/login-qr/:id trúng worker khác → 404 / không authenticated.
 * Nên dùng 1 instance hoặc sticky session phía nginx.
 */
module.exports = {
  apps: [
    {
      name: "nextjs_zca",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        COOKIE_SECURE: "false",
      },
    },
  ],
};
