import { ElementStore, LayoutStore } from '@waveditors/editor-model';

export const isLayoutStore = (element: ElementStore): element is LayoutStore =>
  element.bs.value.type === 'layout';
