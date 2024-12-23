import { createApp, h } from 'vue';

import App from './App.vue';

const CONTAINER_ID = 'vue-inspector-plus-container';

function load() {
  if (!window?.__VUE_INSPECTOR__) return;

  let container = document.getElementById(CONTAINER_ID);
  if (container) return;

  container = document.createElement('div');
  container.id = CONTAINER_ID;
  document.body.appendChild(container);

  const app = createApp({ render: () => h(App), devtools: { hide: true } });
  app.mount(`#${CONTAINER_ID}`);
}

load();
