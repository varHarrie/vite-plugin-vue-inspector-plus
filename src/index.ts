import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { normalizePath, type PluginOption, type ResolvedConfig } from 'vite';

export type Options = {
  modifierKey?: string;
};

function VitePluginVueInspectorPlus(options: Options = {}): PluginOption {
  const INSPECTOR_PREFIX = 'virtual:vue-inspector-plus';
  const DEFAULT_OPTIONS = { modifierKey: 'meta|ctrl' };

  const dir = normalizePath(path.dirname(fileURLToPath(import.meta.url)));
  let config: ResolvedConfig;

  return {
    name: 'vite-plugin-vue-inspector-plus',
    enforce: 'pre',
    apply(_, { command }) {
      return command === 'serve' && process.env.NODE_ENV !== 'test';
    },
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'script',
            injectTo: 'head',
            attrs: {
              type: 'module',
              src: `${config.base || '/'}@id/${INSPECTOR_PREFIX}/inspector/index.js`,
            },
          },
        ],
      };
    },
    resolveId(id) {
      if (id === `${INSPECTOR_PREFIX}/options`) {
        return id;
      }

      if (id === `${INSPECTOR_PREFIX}/inspector/index.js`) {
        return dir + '/inspector/index.js';
      }
    },
    load(id) {
      if (id === `${INSPECTOR_PREFIX}/options`) {
        return `export default ${JSON.stringify({
          ...DEFAULT_OPTIONS,
          ...options,
          root: config.root,
        })}`;
      }

      if (id.startsWith(dir)) {
        if (id.includes('&type=')) return;
        return fs.readFile(id, 'utf-8');
      }
    },
  };
}

export default VitePluginVueInspectorPlus;
