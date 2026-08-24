# Audio2AAC — 在线音频转 AAC 转换器

黑白配色、桌面应用风格布局的在线音频转 AAC 网站。
全部转换在**浏览器本地**通过 FFmpeg.wasm 完成，文件不会上传服务器。

### 跨源隔离与多线程核心

多线程核心依赖 `SharedArrayBuffer`，需要页面开启跨源隔离（COOP/COEP 响应头）。
GitHub Pages 无法自定义响应头，本项目通过 `public/coi-sw.js` 这个 Service Worker
**自动补上响应头**，无需任何服务端配置。首次访问会自动重载一次页面以完成隔离，
之后即启用多线程核心，转换速度显著提升。

自建托管（nginx 等）时可以二选一：

1. 沿用上述 SW 方案（零配置，但多一次首次重载）
2. 由服务器直接下发响应头（开发/预览服务器已在 `vite.config.js` 配好），SW 检测到已隔离后不会重载：

```nginx
server {
    listen 80;
    root /path/to/aac/dist;
    index index.html;

    add_header Cross-Origin-Opener-Policy same-origin always;
    add_header Cross-Origin-Embedder-Policy require-corp always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

无法开启隔离的环境（如无 HTTPS 的明文 HTTP）会自动回退**单线程核心**，功能不受影响。

### 引擎缓存

FFmpeg 核心（约 32–64MB）会通过 Cache Storage API 持久缓存在浏览器本地，
二次打开网站不再重新下载（GitHub Pages 默认的 `max-age=600` 缓存头管不住这么大的文件）。
缓存的版本号跟随 `@ffmpeg/core`，升级依赖后旧缓存自动清理；用户也可以在「关于」面板
查看缓存大小或手动清除。

## 功能

- 支持输入：MP3 / WAV / FLAC / OGG / Opus / M4A / AAC / WMA / AIFF / APE / AMR / AC3 / WEBM 等
- 输出：M4A（AAC / MP4 容器，推荐）或 AAC（ADTS 裸流）
- 可调比特率（32–320 kbps）、采样率、声道
- 批量转换队列、逐文件进度与日志、本地下载
- 转换完成后可单行「重转」或「全部重转」；修改参数后已完成项会提示重新转换
- 引擎核心本地持久缓存 + 自动启用多线程核心
- 拖拽添加文件

