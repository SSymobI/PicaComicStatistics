import type { RevealBinding, RevealState } from '@types-project/animation';
import type { ObjectDirective } from 'vue';
import { MotionReveal } from '@/constants/motion';
import { prefersReducedMotion } from '@/utils/motion';

const INIT_CLASS = 'reveal-init';
const IN_CLASS = 'reveal-in';

const pending = new WeakMap<HTMLElement, RevealState>();
let observer: IntersectionObserver | undefined;

function ensureObserver(): IntersectionObserver | undefined {
  if (typeof IntersectionObserver === 'undefined')
    return undefined;
  observer ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      const options = pending.get(element);
      if (!options)
        continue;
      if (entry.isIntersecting) {
        element.classList.remove(INIT_CLASS);
        element.classList.add(IN_CLASS);
        if (options.once) {
          pending.delete(element);
          observer?.unobserve(element);
        }
      }
      else if (!options.once) {
        element.classList.remove(IN_CLASS);
        element.classList.add(INIT_CLASS);
      }
    }
  }, { threshold: MotionReveal.THRESHOLD, rootMargin: MotionReveal.ROOT_MARGIN });
  return observer;
}

/**
 * 滚动进入视口的入场指令。
 * 用户声明减少动态效果时不做任何处理，内容直接呈现。
 */
const revealDirective: ObjectDirective<HTMLElement, RevealBinding> = {
  mounted(element, binding) {
    if (prefersReducedMotion())
      return;
    const instance = ensureObserver();
    if (!instance)
      return;
    const options = binding.value ?? {};
    if (options.delay)
      element.style.setProperty('--reveal-delay', `${options.delay}ms`);
    element.classList.add(INIT_CLASS);
    pending.set(element, { once: options.once ?? true });
    instance.observe(element);
  },
  unmounted(element) {
    pending.delete(element);
    observer?.unobserve(element);
  },
};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('reveal', revealDirective);
});
