<template>
  <div v-if="activeItemRectStyle" :class="$style.overlay" :style="activeItemRectStyle"></div>
  <transition
    :enter-active-class="$style['scale-fade-active']"
    :leave-active-class="$style['scale-fade-active']"
    :enter-from-class="$style['scale-fade-inactive']"
    :leave-to-class="$style['scale-fade-inactive']"
  >
    <ul
      v-if="stack.length"
      ref="dropdownRef"
      :class="$style.dropdown"
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
      @mouseleave="handleDropdownMouseLeave"
    >
      <li
        :class="[
          $style.item,
          {
            [$style.element]: item.type === 'element',
            [$style.component]: item.type === 'component',
            [$style.route]: item.route,
            [$style.splitted]: item.file && item.location,
          },
        ]"
        v-for="(item, index) in stack"
        :key="index"
        :dataFile="item.file"
        :dataLocation="item.location"
        @mouseenter="handleItemMouseEnter(item)"
      >
        <span v-if="item.file" :class="$style.icon" @click="handleOpenLocation(item.file)">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path
              d="M21 16.008v-8.018a1.98 1.98 0 0 0 -1 -1.717l-7 -4.008a2.016 2.016 0 0 0 -2 0l-7 4.008c-.619 .355 -1 1.01 -1 1.718v8.018c0 .709 .381 1.363 1 1.717l7 4.008a2.016 2.016 0 0 0 2 0l7 -4.008c.619 -.355 1 -1.01 1 -1.718z"
            />
            <path d="M12 22v-10" />
            <path d="M12 12l8.73 -5.04" />
            <path d="M3.27 6.96l8.73 5.04" />
          </svg>
        </span>
        <span v-else :class="$style.icon" @click="handleOpenLocation(item.location)">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <circle cx="12" cy="12" r=".5" fill="currentColor" />
            <path d="M12 12m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
            <path d="M12 3l0 2" />
            <path d="M3 12l2 0" />
            <path d="M12 19l0 2" />
            <path d="M19 12l2 0" />
          </svg>
        </span>
        <div :class="$style.main" @click="handleOpenLocation(item.location || item.file)">
          <span :class="$style.title">
            {{ item.title || 'Unknown' }}
          </span>
          <span :class="$style.location">
            {{ toRelativePath(item.location || item.file) }}
          </span>
        </div>
      </li>
    </ul>
  </transition>
</template>

<script lang="ts">
declare global {
  interface Window {
    __VUE_INSPECTOR__?: {
      openInEditor: (baseUrl: string, file: string, line: string, column: string) => void;
    };
    __VUE_DEVTOOLS_OPEN_IN_EDITOR_BASE_URL__: string;
  }
}

type VueInstance = {
  vnode: {
    el: HTMLElement;
    props: Record<string, unknown>;
  };
  parent: VueInstance;
  type: {
    name?: string;
    __name?: string;
    __file?: string;
  };
};

type VueHtmlElement = HTMLElement & {
  __vueParentComponent: VueInstance;
  __vnode: {
    props: Record<string, unknown>;
  };
};

type VueStackItem = {
  type: 'element' | 'component';
  el?: VueHtmlElement;
  title?: string;
  location?: string;
  file?: string;
  route?: boolean;
};
</script>

<script lang="ts" setup>
import options from 'virtual:vue-inspector-plus/options';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';

const SUPPORTED_MODIFIER_KEYS = ['shift', 'ctrl', 'alt', 'meta'];
const DATA_KEY = '__v_inspector';

const inspector = window.__VUE_INSPECTOR__;
const baseUrl = window.__VUE_DEVTOOLS_OPEN_IN_EDITOR_BASE_URL__;

const dropdownRef = ref<HTMLElement>();
const position = ref({ top: 0, left: 0 });
const stack = ref<VueStackItem[]>([]);
const activeItem = ref<VueStackItem>();

const activeItemRectStyle = computed(() => {
  if (!activeItem.value || activeItem.value.el?.nodeType !== Node.ELEMENT_NODE) return null;

  const { top, left, width, height } = activeItem.value.el.getBoundingClientRect();

  return {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    height: `${height}px`,
  };
});

function matchModifierKey(e: MouseEvent) {
  const conditions = options.modifierKey.split('|');

  return conditions.some((condition) => {
    return condition
      .toLowerCase()
      .split('+')
      .filter((name) => SUPPORTED_MODIFIER_KEYS.includes(name))
      .every((name) => (e as unknown as Record<string, boolean>)[name + 'Key']);
  });
}

function pascalize(str?: string) {
  return str
    ?.split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function getFileName(path?: string) {
  if (!path) return undefined;
  const name = path.split('/').pop();
  return name?.replace(/\.\w+$/, '');
}

function toRelativePath(path?: string) {
  const result = path?.replace(options.root, '');
  return result?.startsWith('/') ? result : '/' + result;
}

function getLocation(path: string) {
  const [, file, line, column] = path?.match(/(.+):([\d]+):([\d]+)$/) || [];

  return {
    file: file ?? path,
    line: line ?? 1,
    column: column ?? 1,
  };
}

function getVueElement(el: VueHtmlElement) {
  const vnode = el.__vnode;
  if (!vnode) return null;

  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.getAttribute('class')
    ? `.${el.getAttribute('class')!.replace(/\s+/g, '.')}`
    : '';
  const title = `${tag}${id}${classes}`;

  const location = vnode.props?.[DATA_KEY];

  return { type: 'element', el, title, file: undefined, location, route: undefined };
}

function getVueComponents(el: VueHtmlElement) {
  const vms = [];
  let vm = el.__vueParentComponent;

  while (vm) {
    vms.push(vm);
    vm = vm.parent;
  }

  return vms.map((vm) => {
    if (vm.type.name === 'RouterView') {
      return { type: 'component' };
    }

    const el = vm.vnode.el;
    const file = vm.type.__file;
    const title = pascalize(vm.type.__name || vm.type.name || getFileName(file));
    const location = vm.vnode.props?.[DATA_KEY];
    const route = vm.parent?.type.name === 'RouterView';

    return { type: 'component', el, title, file, location, route };
  });
}

function getVueStack(el: VueHtmlElement) {
  return [getVueElement(el), ...getVueComponents(el)].filter(
    (item) => item && (item.file || item.location),
  ) as VueStackItem[];
}

function updatePosition(left: number, top: number) {
  position.value = { left, top };

  nextTick().then(() => {
    if (!dropdownRef.value) return;
    const width = dropdownRef.value.offsetWidth;
    const height = dropdownRef.value.offsetHeight;

    if (left + width > window.innerWidth) {
      position.value.left = Math.max(0, window.innerWidth - width - 10);
    }

    if (top + height > window.innerHeight) {
      position.value.top = Math.max(0, window.innerHeight - height - 10);
    }
  });
}

const handleClick = (e: MouseEvent) => {
  clear();

  if (!matchModifierKey(e)) return;
  if (dropdownRef.value?.contains(e.target as HTMLElement)) return;

  e.preventDefault();
  e.stopPropagation();

  stack.value = getVueStack(e.target as VueHtmlElement);
  updatePosition(e.clientX + 2, e.clientY + 2);
};

const clear = () => {
  stack.value = [];
  activeItem.value = undefined;
};

const handleOpenLocation = (location?: string) => {
  if (!location) return;
  const { file, line, column } = getLocation(location);
  inspector?.openInEditor(baseUrl, file, line, column);
};

const handleItemMouseEnter = (item: VueStackItem) => {
  if (!stack.value.length) return;
  activeItem.value = item;
};

const handleDropdownMouseLeave = () => {
  activeItem.value = undefined;
};

onMounted(() => {
  document.addEventListener('click', handleClick, { capture: true });
  window.addEventListener('resize', clear);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClick);
  window.removeEventListener('resize', clear);
});
</script>

<style module>
.overlay {
  position: fixed;
  z-index: 100000;
  padding: 4px;
  border: 1px solid rgba(66, 184, 131, 0.8);
  background: rgba(66, 184, 131, 0.2);
  pointer-events: none;
  box-sizing: border-box;
  transition: all 0.2s;
}

.dropdown {
  position: fixed;
  z-index: 2147483647;
  margin: 0;
  padding: 0;
  max-width: 350px;
  list-style: none;
  font-family: Arial, Helvetica, sans-serif;
  background: white;
  box-shadow: 0px 9px 28px 8px rgba(0, 0, 0, 0.05), 0px 6px 16px 0px rgba(0, 0, 0, 0.08),
    0px 3px 6px -4px rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  transition: top 0.2s, left 0.2s;
}

.item {
  display: flex;
  align-items: center;
  line-height: 32px;
  word-break: keep-all;
  white-space: nowrap;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

.item.element .title {
  color: #878b95;
}

.item.component .title {
  color: #42b883;
}

.item.component.route .title {
  color: #4b7eff;
}

.item.splitted .icon {
  border-right-color: rgba(0, 0, 0, 0.06);
}

.item:not(.splitted):hover .icon,
.item:not(.splitted):hover .main {
  background: rgba(0, 0, 0, 0.03);
}

.item:not(.splitted):hover .main::after {
  visibility: visible;
}

.icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-right: 1px solid transparent;
  color: #8e67cd;
  transition: background 0.2s;
}

.icon:hover {
  background: rgba(0, 0, 0, 0.03);
}

.icon svg {
  width: 16px;
}

.main {
  padding-left: 8px;
  padding-right: 8px;
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
  min-width: 0;
  transition: background 0.15s;
}

.main:hover {
  background: rgba(0, 0, 0, 0.03);
}

.main::after {
  margin-left: -4px;
  display: block;
  width: 4px;
  height: 4px;
  border-top: 1px solid rgba(0, 0, 0, 0.3);
  border-right: 1px solid rgba(0, 0, 0, 0.3);
  content: '';
  transform: rotate(45deg);
  visibility: hidden;
}

.main:hover::after {
  visibility: visible;
}

.title {
  max-width: 150px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.location {
  margin-right: auto;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
}

.scale-fade-active {
  transition: transform 0.13s, opacity 0.1s;
  transform-origin: top center;
}

.scale-fade-inactive {
  transform: scaleY(0.9);
  opacity: 0;
}
</style>
