declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, never>, Record<string, never>, any>;
  export default component;
}

declare module 'virtual:vue-inspector-plus/options' {
  import type { Options } from './src/index';
  const options: { modifierKey: string; root: string };
  export default options;
}
