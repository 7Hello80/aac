/* eslint-env serviceworker */
/**
 * 跨源隔离 Service Worker。
 *
 * GitHub Pages 这类静态托管无法自定义响应头，浏览器拿不到
 * COOP/COEP，`self.crossOriginIsolated` 恒为 false，SharedArrayBuffer
 * 不可用，FFmpeg 多线程核心（core-mt）永远加载不了。
 *
 * 这里由 SW 拦截同源响应并补上这两个头，使页面进入跨源隔离状态。
 * 代价：首次访问需要重载一次页面（见 src/composables/useCrossOriginIsolation.js）。
 *
 * 注意：启用 COEP require-corp 后，任何缺少 CORP/CORS 头的跨源子资源都会被拦截。
 * 本站所有资源（Element Plus、Font Awesome 字体等）都由 Vite 打包为同源文件，
 * 因此是安全的；后续若引入 CDN 资源，需要同步确认其带有 CORP 头。
 */

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'deregister') {
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => clients.forEach((client) => client.navigate(client.url)));
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 该组合由浏览器内部用于导航预加载探测，重新 fetch 会抛错
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 不透明响应（status 0）无法读取或改写，原样放行
        if (response.status === 0) return response;

        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Resource-Policy', 'same-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
      .catch((err) => {
        console.error('[coi-sw]', err);
        return Response.error();
      })
  );
});
