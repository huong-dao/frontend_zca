/**
 * Khớp lệnh thường gặp: `pm2 start npm --name nextjs_zca -- start`
 * (tương đương `npm run start` → `next start -p 3001` trong package.json).
 *
 * - fork_mode + 1 instance: OK (không phải lỗi cluster).
 * - Nếu `pm2 describe` hiện `node env: N/A`, nên set NODE_ENV trong `env` để Next chạy đúng production.
 * - COOKIE_SECURE=false: bắt buộc nếu chỉ dùng http://IP:3001 (không HTTPS).
 *
 * Deploy: chỉnh cwd nếu cần, rồi:
 *   pm2 delete nextjs_zca
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "nextjs_zca",
      script: "npm",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
        COOKIE_SECURE: "false",
      },
    },
  ],
};
