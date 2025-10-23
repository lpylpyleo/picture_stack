export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Attempt to serve the static asset from the ASSETS binding
    let response = await env.ASSETS.fetch(request);

    // If the request results in a 404, and it doesn't look like a file request (no extension),
    // serve index.html to support SPA client-side routing.
    if (response.status === 404 && !url.pathname.includes('.')) {
      response = await env.ASSETS.fetch(new URL('/index.html', request.url));
    }

    return response;
  },
};
