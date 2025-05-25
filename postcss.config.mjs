// postcss.config.mjs  ——  v4 官方建議寫法
const config = {
  plugins: {
    "@tailwindcss/postcss": {},   // v4 專用 PostCSS 插件
    autoprefixer: {},            // 保留自動加前綴
  },
};
export default config;
